"""
Core submission flow: validate → call LLM → deduct points → persist → handle first-kill.
Points are only deducted AFTER the LLM call succeeds — if LLM fails, nothing is touched.
"""
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException

from sqlalchemy.exc import IntegrityError
from core.config import settings
from models.user import User
from models.boss import Boss
from models.submission import Submission
from models.boss_response import BossResponse
from models.boss_defeat import BossDefeat
from models.prize_pool import PrizePool
from models.point_transaction import PointTransaction
from models.reference_pool import ReferencePoolItem
from parsers.resume_parser import parse_resume
from llm.evaluator import evaluate_resume, EvaluationError

logger = logging.getLogger(__name__)


def _load_boss_config(slug: str) -> dict:
    config_path = os.path.join(settings.BOSS_CONFIGS_PATH, f"{slug.replace('-', '_')}.json")
    if not os.path.exists(config_path):
        raise HTTPException(status_code=500, detail=f"Boss config not found: {slug}")
    with open(config_path) as f:
        return json.load(f)


def _get_prior_versions(db: Session, user_id: uuid.UUID, boss_id: uuid.UUID, limit: int) -> list[dict]:
    submissions = (
        db.query(Submission)
        .filter(Submission.user_id == user_id, Submission.boss_id == boss_id)
        .order_by(Submission.version_number.desc())
        .limit(limit)
        .all()
    )
    result = []
    for s in submissions:
        if s.boss_response:
            result.append({
                "version_number": s.version_number,
                "mood": s.boss_response.mood,
                "top_issues": json.loads(s.boss_response.top_issues_json),
            })
    return list(reversed(result))


def _get_reference_items(db: Session, boss_slug: str, mood_level: int) -> list[dict]:
    """
    Select reference pool items to inject into the LLM prompt.
    - Excellent samples: always included, capped at MAX_REFERENCE_ITEMS
    - Victory descriptor: always included (1 item)
    - Bad sample: injected at mood level 1–2 (early submissions)
    - Mid sample: injected at mood level 3–4 (improving but not done)
    """
    items = db.query(ReferencePoolItem).filter(
        ReferencePoolItem.boss_scope.in_(["global", boss_slug])
    ).all()

    excellent, victory, bad, mid = [], [], [], []
    for item in items:
        if item.type == "excellent":
            excellent.append({"type": item.type, "content": item.content})
        elif item.type == "victory_descriptor":
            victory.append({"type": item.type, "content": item.content})
        elif item.type == "bad":
            bad.append({"type": item.type, "content": item.content})
        elif item.type == "mid":
            mid.append({"type": item.type, "content": item.content})

    selected = excellent[:settings.MAX_REFERENCE_ITEMS]  # cap excellent samples
    selected += victory[:1]                               # always 1 victory descriptor
    if mood_level <= 2:
        selected += bad[:1]                               # early: show bad examples
    elif 3 <= mood_level <= 4:
        selected += mid[:1]                               # improving: show mid examples

    return selected


def upload_resume(
    db: Session,
    user_id: uuid.UUID,
    boss_id: uuid.UUID,
    file_path: str,
    source_type: str,
    plain_text: str | None = None,
) -> dict:
    """Parse uploaded resume, store submission record, return preview."""
    boss = db.query(Boss).filter(Boss.id == boss_id, Boss.status == "current").first()
    if not boss:
        raise HTTPException(status_code=404, detail="No active boss found")

    if source_type == "text":
        extracted_text = plain_text or ""
        image_paths = []
        image_base64 = []
    else:
        parsed = parse_resume(file_path, source_type, settings.FILE_STORAGE_PATH)
        extracted_text = parsed["text"]
        image_paths = parsed["image_paths"]
        image_base64 = parsed["image_base64"]
        # Delete original uploaded file immediately after parsing — we only keep extracted text
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

    # Get next version number for this user+boss
    last = (
        db.query(Submission)
        .filter(Submission.user_id == user_id, Submission.boss_id == boss_id)
        .order_by(Submission.version_number.desc())
        .first()
    )
    version_number = (last.version_number + 1) if last else 1

    submission = Submission(
        id=uuid.uuid4(),
        user_id=user_id,
        boss_id=boss_id,
        version_number=version_number,
        source_type=source_type,
        original_file_path=file_path,
        extracted_text=extracted_text,
        image_paths=json.dumps(image_paths),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return {
        "submission_id": str(submission.id),
        "version_number": version_number,
        "extracted_text_preview": extracted_text[:300] if extracted_text else "",
        "extracted_text": extracted_text or "",
        "source_type": source_type,
    }


def submit_for_evaluation(db: Session, user_id: uuid.UUID, boss_id: uuid.UUID, submission_id: uuid.UUID, language: str = "en") -> dict:
    """
    Main evaluation flow.
    Step 1: Validate user has enough points (no deduction yet).
    Step 2: Call LLM (no DB writes yet — if it fails, nothing is touched).
    Step 3: Deduct points + credit prize pool + persist response (single atomic commit).
    Step 4: Handle first-kill settlement if approved.
    """
    # --- Load required records ---
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    boss = db.query(Boss).filter(Boss.id == boss_id, Boss.status == "current").first()
    if not boss:
        raise HTTPException(status_code=404, detail="Boss not active")

    submission = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.user_id == user_id,
        Submission.boss_id == boss_id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # --- Guard: prevent double evaluation for the same submission ---
    existing_response = db.query(BossResponse).filter(BossResponse.submission_id == submission_id).first()
    if existing_response:
        db.refresh(user)
        prize_pool = db.query(PrizePool).filter(PrizePool.boss_id == boss_id).first()
        return {
            "response_id": str(existing_response.id),
            "submission_id": str(submission_id),
            "version_number": submission.version_number,
            "roast_opening": existing_response.roast_opening,
            "why_it_fails": existing_response.why_it_fails,
            "top_issues": json.loads(existing_response.top_issues_json),
            "fix_direction": existing_response.fix_direction,
            "mood": existing_response.mood,
            "mood_level": existing_response.mood_level,
            "approved": existing_response.approved,
            "approved_phrase": existing_response.approved_phrase,
            "world_first": False,
            "points_deducted": 0,
            "points_remaining": user.points,
            "prize_pool": prize_pool.total_points if prize_pool else 0,
            "points_won": 0,
        }

    # --- Step 1: Validate points (no deduction yet) ---
    cost = settings.SUBMISSION_COST
    if user.points < cost:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "insufficient_points",
                "points_required": cost,
                "points_remaining": user.points,
            }
        )

    # --- Step 2: Call LLM FIRST (before any DB writes) ---
    boss_config = _load_boss_config(boss.slug)
    prior_versions = _get_prior_versions(db, user_id, boss_id, settings.MAX_PRIOR_VERSIONS)
    reference_items = _get_reference_items(db, boss.slug, len(prior_versions) + 1)
    from parsers.resume_parser import images_to_base64
    image_paths = json.loads(submission.image_paths or "[]")

    # Clear image_paths in DB NOW, before trying to read the files.
    # This ensures retries never hit FileNotFoundError even if the read below fails.
    try:
        submission.image_paths = "[]"
        submission.original_file_path = None
        db.commit()
    except Exception:
        db.rollback()

    # Load images into memory (files may no longer exist on a retry — that is fine, we skip them)
    image_base64 = []
    if image_paths:
        existing_paths = [p for p in image_paths if p and os.path.exists(p)]
        image_base64 = images_to_base64(existing_paths) if existing_paths else []

    try:
        eval_result = evaluate_resume(
            boss_config=boss_config,
            rudeness_level=boss.rudeness_level,
            extracted_text=submission.extracted_text or "",
            image_base64_list=image_base64,
            prior_versions=prior_versions,
            reference_items=reference_items,
            language=language,
        )
    except EvaluationError as e:
        logger.error(f"Evaluation failed for submission {submission_id}: {e}")
        raise HTTPException(status_code=503, detail="The boss refused to respond. Try again.")
    finally:
        # Delete any image files that are still on disk
        for img_path in image_paths:
            if img_path and os.path.exists(img_path):
                try:
                    os.remove(img_path)
                except OSError:
                    pass

    # --- Step 3: LLM succeeded — now deduct points + persist in one atomic commit ---
    user = db.query(User).filter(User.id == user_id).with_for_update().first()
    if user.points < cost:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "insufficient_points",
                "points_required": cost,
                "points_remaining": user.points,
            }
        )

    user.points -= cost

    prize_pool = db.query(PrizePool).filter(PrizePool.boss_id == boss_id).with_for_update().first()
    if not prize_pool:
        prize_pool = PrizePool(id=uuid.uuid4(), boss_id=boss_id, total_points=100)
        db.add(prize_pool)

    prize_pool.total_points += cost

    db.add(PointTransaction(
        id=uuid.uuid4(),
        user_id=user_id,
        amount=-cost,
        type="submission_fee",
        boss_id=boss_id,
        submission_id=submission_id,
    ))

    boss_response = BossResponse(
        id=uuid.uuid4(),
        submission_id=submission_id,
        roast_opening=eval_result["roast_opening"],
        why_it_fails=eval_result.get("why_it_fails", ""),
        top_issues_json=json.dumps(eval_result.get("top_issues", [])),
        fix_direction=eval_result.get("fix_direction", ""),
        mood=eval_result["mood"],
        mood_level=eval_result["mood_level"],
        approved=eval_result["approved"],
        approved_phrase=eval_result.get("approved_phrase"),
        raw_llm_response=eval_result.get("raw"),
    )
    db.add(boss_response)
    try:
        db.commit()
    except IntegrityError:
        # Race condition: another concurrent request already wrote the response.
        # Roll back and return the existing one instead of crashing.
        db.rollback()
        existing = db.query(BossResponse).filter(BossResponse.submission_id == submission_id).first()
        if existing:
            db.refresh(user)
            db.refresh(prize_pool)
            return {
                "response_id": str(existing.id),
                "submission_id": str(submission_id),
                "version_number": submission.version_number,
                "roast_opening": existing.roast_opening,
                "why_it_fails": existing.why_it_fails,
                "top_issues": json.loads(existing.top_issues_json),
                "fix_direction": existing.fix_direction,
                "mood": existing.mood,
                "mood_level": existing.mood_level,
                "approved": existing.approved,
                "approved_phrase": existing.approved_phrase,
                "world_first": False,
                "points_deducted": 0,
                "points_remaining": user.points,
                "prize_pool": prize_pool.total_points if prize_pool else 0,
                "points_won": 0,
                "extracted_text_for_encryption": submission.extracted_text or "",
            }
        raise

    # --- Step 4: First-kill settlement ---
    world_first = False
    points_won = 0

    if eval_result["approved"]:
        world_first, points_won = _attempt_first_kill_settlement(db, boss, user, submission_id, prize_pool)

    db.refresh(user)
    db.refresh(prize_pool)

    return {
        "response_id": str(boss_response.id),
        "submission_id": str(submission_id),
        "version_number": submission.version_number,
        "roast_opening": boss_response.roast_opening,
        "why_it_fails": boss_response.why_it_fails,
        "top_issues": json.loads(boss_response.top_issues_json),
        "fix_direction": boss_response.fix_direction,
        "mood": boss_response.mood,
        "mood_level": boss_response.mood_level,
        "approved": boss_response.approved,
        "approved_phrase": boss_response.approved_phrase,
        "world_first": world_first,
        "points_deducted": cost,
        "points_remaining": user.points,
        "prize_pool": prize_pool.total_points,
        "points_won": points_won,
        # Returned so client can encrypt it locally; server won't store it in plaintext if client encrypts
        "extracted_text_for_encryption": submission.extracted_text or "",
    }


def _attempt_first_kill_settlement(
    db: Session,
    boss: Boss,
    user: User,
    submission_id: uuid.UUID,
    prize_pool: PrizePool,
) -> tuple[bool, int]:
    """
    Try to register first kill and settle the prize pool.
    Returns (world_first: bool, points_won: int).
    Uses unique constraint on BossDefeat.boss_id as the race guard.
    """
    try:
        defeat = BossDefeat(
            id=uuid.uuid4(),
            boss_id=boss.id,
            user_id=user.id,
            submission_id=submission_id,
        )
        db.add(defeat)
        db.flush()  # triggers unique constraint if already exists
    except IntegrityError:
        db.rollback()
        return False, 0

    # Verify prize pool not yet settled (idempotency guard)
    pool = db.query(PrizePool).filter(PrizePool.boss_id == boss.id).with_for_update().first()
    if pool.settled:
        db.rollback()
        return False, 0

    points_won = pool.total_points
    user.points += points_won
    pool.settled = True
    pool.winner_user_id = user.id
    pool.settled_at = datetime.now(timezone.utc)

    boss.status = "defeated"
    # Unlock next boss
    next_boss = db.query(Boss).filter(
        Boss.order_index == boss.order_index + 1
    ).first()
    if next_boss:
        next_boss.status = "current"
        # Only create PrizePool if one does not already exist for next boss
        existing_pool = db.query(PrizePool).filter(PrizePool.boss_id == next_boss.id).first()
        if not existing_pool:
            next_pool = PrizePool(id=uuid.uuid4(), boss_id=next_boss.id, total_points=100)
            db.add(next_pool)
        elif existing_pool.settled:
            # Reset a previously settled pool for this boss (e.g. after admin reset)
            existing_pool.settled = False
            existing_pool.winner_user_id = None
            existing_pool.settled_at = None
            existing_pool.total_points = 0

    db.add(PointTransaction(
        id=uuid.uuid4(),
        user_id=user.id,
        amount=points_won,
        type="prize_payout",
        boss_id=boss.id,
        submission_id=submission_id,
    ))

    db.commit()
    return True, points_won
