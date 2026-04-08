import os
import uuid
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from core.database import get_db
from core.config import settings
from api.deps import get_current_user
from models.user import User
from models.boss import Boss
from models.prize_pool import PrizePool
from models.submission import Submission
from services.submission_service import upload_resume, submit_for_evaluation
import json
import aiofiles

router = APIRouter(tags=["game"])


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user_id": str(current_user.id),
        "display_name": current_user.display_name,
        "email": current_user.email,
        "points": current_user.points,
    }


@router.get("/me/history")
def get_my_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from models.boss_response import BossResponse
    from models.boss_defeat import BossDefeat
    from sqlalchemy import func as sqlfunc

    subs = (
        db.query(Submission)
        .filter(Submission.user_id == current_user.id)
        .order_by(Submission.created_at.desc())
        .limit(50)
        .all()
    )

    total_submissions = db.query(func.count(Submission.id)).filter(
        Submission.user_id == current_user.id
    ).scalar() or 0

    bosses_defeated = db.query(func.count(BossDefeat.id)).filter(
        BossDefeat.user_id == current_user.id
    ).scalar() or 0

    history = []
    for s in subs:
        r = s.boss_response
        history.append({
            "submission_id": str(s.id),
            "boss_name": s.boss.name if s.boss else "Unknown",
            "boss_slug": s.boss.slug if s.boss else "",
            "version_number": s.version_number,
            "created_at": s.created_at.isoformat(),
            "mood": r.mood if r else None,
            "mood_level": r.mood_level if r else None,
            "approved": r.approved if r else False,
            "roast_opening": r.roast_opening if r else None,
        })

    return {
        "stats": {
            "total_submissions": total_submissions,
            "bosses_defeated": bosses_defeated,
            "points": current_user.points,
        },
        "history": history,
    }


@router.post("/upload")
async def upload(
    file: UploadFile | None = File(default=None),
    source_type: str = Form(...),
    text_content: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    boss = db.query(Boss).filter(Boss.status == "current").first()
    if not boss:
        raise HTTPException(status_code=404, detail="No active boss")

    allowed = settings.ALLOWED_FILE_TYPES.split(",")
    file_path = None

    if source_type in ("pdf", "docx"):
        if not file:
            raise HTTPException(status_code=400, detail="File required for pdf/docx")
        ext = source_type
        if file.size and file.size > settings.FILE_UPLOAD_MAX_BYTES:
            raise HTTPException(status_code=413, detail="File too large")
        os.makedirs(settings.FILE_STORAGE_PATH, exist_ok=True)
        file_path = os.path.join(settings.FILE_STORAGE_PATH, f"{uuid.uuid4()}.{ext}")
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
    elif source_type == "text":
        if not text_content:
            raise HTTPException(status_code=400, detail="text_content required for text source")
    else:
        raise HTTPException(status_code=400, detail=f"source_type must be one of: {allowed}")

    return upload_resume(db, current_user.id, boss.id, file_path, source_type, text_content)


class SubmitRequest(BaseModel):
    submission_id: uuid.UUID
    language: str = "en"


@router.post("/submit/{boss_id}")
def submit(
    boss_id: uuid.UUID,
    body: SubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lang = body.language if body.language in ("en", "zh") else "en"
    return submit_for_evaluation(db, current_user.id, boss_id, body.submission_id, language=lang)


@router.get("/boss/current")
def get_current_boss(db: Session = Depends(get_db)):
    boss = db.query(Boss).filter(Boss.status == "current").first()
    if not boss:
        raise HTTPException(status_code=404, detail="No active boss")
    pool = db.query(PrizePool).filter(PrizePool.boss_id == boss.id).first()
    defeat = boss.defeat
    return {
        "id": str(boss.id),
        "name": boss.name,
        "slug": boss.slug,
        "order_index": boss.order_index,
        "status": boss.status,
        "specialty": boss.specialty,
        "defeated_at": defeat.defeated_at.isoformat() if defeat else None,
        "world_first_defeater": defeat.user.display_name if defeat else None,
        "prize_pool": pool.total_points if pool else 0,
    }


@router.get("/bosses/progress")
def get_bosses_progress(db: Session = Depends(get_db)):
    bosses = db.query(Boss).order_by(Boss.order_index).all()
    result = []
    for boss in bosses:
        pool = db.query(PrizePool).filter(PrizePool.boss_id == boss.id).first()
        defeat = boss.defeat
        result.append({
            "id": str(boss.id),
            "name": boss.name,
            "slug": boss.slug,
            "order_index": boss.order_index,
            "status": boss.status,
            "specialty": boss.specialty,
            "defeated_at": defeat.defeated_at.isoformat() if defeat else None,
            "world_first_defeater": defeat.user.display_name if defeat else None,
            "prize_pool": pool.total_points if pool else 0,
        })
    return {"bosses": result}


@router.get("/leaderboard")
def get_leaderboard(
    type: str = "first_defeaters",
    limit: int = 20,
    db: Session = Depends(get_db),
):
    from models.boss_defeat import BossDefeat
    from sqlalchemy import func as sqlfunc

    if type == "first_defeaters":
        defeats = db.query(BossDefeat).order_by(BossDefeat.defeated_at).limit(limit).all()
        return {
            "entries": [
                {
                    "user_handle": d.user.display_name,
                    "boss_name": d.boss.name,
                    "metric_value": 1,
                    "metric_label": "world first",
                    "achieved_at": d.defeated_at.isoformat(),
                }
                for d in defeats
            ]
        }

    if type == "fastest_clears":
        # Users who defeated a boss, sorted by time elapsed from their first submission to defeat
        rows = (
            db.query(
                BossDefeat.boss_id,
                BossDefeat.user_id,
                BossDefeat.defeated_at,
                sqlfunc.min(Submission.created_at).label("first_submission_at"),
            )
            .join(Submission, (Submission.user_id == BossDefeat.user_id) & (Submission.boss_id == BossDefeat.boss_id))
            .group_by(BossDefeat.id, BossDefeat.boss_id, BossDefeat.user_id, BossDefeat.defeated_at)
            .order_by((BossDefeat.defeated_at - sqlfunc.min(Submission.created_at)))
            .limit(limit)
            .all()
        )
        entries = []
        for row in rows:
            defeat = db.query(BossDefeat).filter(
                BossDefeat.boss_id == row.boss_id,
                BossDefeat.user_id == row.user_id,
            ).first()
            if not defeat:
                continue
            elapsed_seconds = int((row.defeated_at - row.first_submission_at).total_seconds())
            entries.append({
                "user_handle": defeat.user.display_name,
                "boss_name": defeat.boss.name,
                "metric_value": elapsed_seconds,
                "metric_label": "seconds",
                "achieved_at": row.defeated_at.isoformat(),
            })
        return {"entries": entries}

    if type == "fewest_attempts":
        # Users who defeated a boss, ranked by how many submissions they needed
        rows = (
            db.query(
                BossDefeat.boss_id,
                BossDefeat.user_id,
                BossDefeat.defeated_at,
                sqlfunc.count(Submission.id).label("attempt_count"),
            )
            .join(Submission, (Submission.user_id == BossDefeat.user_id) & (Submission.boss_id == BossDefeat.boss_id))
            .group_by(BossDefeat.id, BossDefeat.boss_id, BossDefeat.user_id, BossDefeat.defeated_at)
            .order_by(sqlfunc.count(Submission.id))
            .limit(limit)
            .all()
        )
        entries = []
        for row in rows:
            defeat = db.query(BossDefeat).filter(
                BossDefeat.boss_id == row.boss_id,
                BossDefeat.user_id == row.user_id,
            ).first()
            if not defeat:
                continue
            entries.append({
                "user_handle": defeat.user.display_name,
                "boss_name": defeat.boss.name,
                "metric_value": row.attempt_count,
                "metric_label": "attempts",
                "achieved_at": row.defeated_at.isoformat(),
            })
        return {"entries": entries}

    raise HTTPException(status_code=400, detail="Unsupported leaderboard type. Use: first_defeaters | fastest_clears | fewest_attempts")


@router.get("/submission/{submission_id}")
def get_submission(
    submission_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")
    if s.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    r = s.boss_response
    return {
        "submission_id": str(s.id),
        "boss_id": str(s.boss_id),
        "version_number": s.version_number,
        "extracted_text": s.extracted_text,
        "source_type": s.source_type,
        "created_at": s.created_at.isoformat(),
        "boss_response": {
            "roast_opening": r.roast_opening,
            "why_it_fails": r.why_it_fails,
            "top_issues": json.loads(r.top_issues_json),
            "fix_direction": r.fix_direction,
            "mood": r.mood,
            "mood_level": r.mood_level,
            "approved": r.approved,
            "approved_phrase": r.approved_phrase,
        } if r else None,
    }

@router.get("/submissions/{user_id}")
def get_submissions(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    boss = db.query(Boss).filter(Boss.status == "current").first()
    if not boss:
        return {"boss_id": None, "submissions": []}
    subs = (
        db.query(Submission)
        .filter(Submission.user_id == user_id, Submission.boss_id == boss.id)
        .order_by(Submission.version_number)
        .all()
    )
    result = []
    for s in subs:
        r = s.boss_response
        result.append({
            "submission_id": str(s.id),
            "version_number": s.version_number,
            "created_at": s.created_at.isoformat(),
            "mood": r.mood if r else None,
            "mood_level": r.mood_level if r else None,
            "approved": r.approved if r else False,
            "top_issues": json.loads(r.top_issues_json) if r else [],
        })
    return {"boss_id": str(boss.id), "submissions": result}
