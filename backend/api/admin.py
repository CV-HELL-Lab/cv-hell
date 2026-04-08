import os
import re
import uuid
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from core.database import get_db
from core.security import verify_password, create_admin_token
from core.config import settings
from api.deps import get_admin, get_super_admin
from models.boss import Boss
from models.user import User
from models.submission import Submission
from models.boss_response import BossResponse
from models.boss_defeat import BossDefeat
from models.prize_pool import PrizePool
from models.point_transaction import PointTransaction
from models.llm_config import LLMConfig
from llm.client import PROVIDER_DEFAULTS
import json

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class LLMConfigCreateRequest(BaseModel):
    provider: Literal["qwen", "deepseek"]
    api_key: str
    base_url: str | None = None
    model: str | None = None
    is_active: bool = True


class LLMConfigUpdateRequest(BaseModel):
    provider: Literal["qwen", "deepseek"] | None = None
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None
    is_active: bool | None = None


def _mask_api_key(api_key: str) -> str:
    if len(api_key) <= 8:
        return "*" * len(api_key)
    return f"{api_key[:4]}{'*' * (len(api_key) - 8)}{api_key[-4:]}"


def _serialize_llm_config(config: LLMConfig) -> dict:
    return {
        "id": str(config.id),
        "provider": config.provider,
        "base_url": config.base_url,
        "model": config.model,
        "is_active": config.is_active,
        "api_key_masked": _mask_api_key(config.api_key),
        "created_at": config.created_at.isoformat() if config.created_at else None,
        "updated_at": config.updated_at.isoformat() if config.updated_at else None,
    }


def _normalize_provider_defaults(
    provider: Literal["qwen", "deepseek"],
    base_url: str | None,
    model: str | None,
) -> tuple[str, str]:
    defaults = PROVIDER_DEFAULTS[provider]
    resolved_base_url = (base_url or defaults["base_url"]).strip()
    resolved_model = (model or defaults["model"]).strip()
    if not resolved_base_url or not resolved_model:
        raise HTTPException(status_code=400, detail="base_url and model are required")
    return resolved_base_url, resolved_model


def _set_active_llm_config(db: Session, config_id: uuid.UUID) -> None:
    db.query(LLMConfig).update({"is_active": False})
    db.query(LLMConfig).filter(LLMConfig.id == config_id).update({"is_active": True})


@router.post("/login")
def admin_login(body: AdminLoginRequest):
    if body.username != settings.ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(body.password, settings.ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_admin_token()}


@router.post("/logout")
def admin_logout(_: str = Depends(get_admin)):
    return {"ok": True}


@router.get("/llm-configs")
def list_llm_configs(db: Session = Depends(get_db), _: str = Depends(get_admin)):
    configs = db.query(LLMConfig).order_by(LLMConfig.created_at.desc()).all()
    return {"items": [_serialize_llm_config(config) for config in configs]}


@router.post("/llm-configs", status_code=201)
def create_llm_config(body: LLMConfigCreateRequest, db: Session = Depends(get_db), _: str = Depends(get_admin)):
    api_key = body.api_key.strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="api_key is required")

    base_url, model = _normalize_provider_defaults(body.provider, body.base_url, body.model)

    config = LLMConfig(
        id=uuid.uuid4(),
        provider=body.provider,
        api_key=api_key,
        base_url=base_url,
        model=model,
        is_active=False,
    )
    db.add(config)
    db.flush()

    if body.is_active:
        _set_active_llm_config(db, config.id)

    db.commit()
    db.refresh(config)
    return _serialize_llm_config(config)


@router.patch("/llm-configs/{config_id}")
def update_llm_config(
    config_id: uuid.UUID,
    body: LLMConfigUpdateRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin),
):
    config = db.query(LLMConfig).filter(LLMConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="LLM config not found")

    provider = body.provider or config.provider
    if body.provider is not None:
        config.provider = body.provider

    if body.api_key is not None:
        api_key = body.api_key.strip()
        if not api_key:
            raise HTTPException(status_code=400, detail="api_key cannot be empty")
        config.api_key = api_key

    if body.base_url is not None:
        config.base_url = body.base_url.strip()
    elif body.provider is not None:
        config.base_url = PROVIDER_DEFAULTS[provider]["base_url"]

    if body.model is not None:
        config.model = body.model.strip()
    elif body.provider is not None:
        config.model = PROVIDER_DEFAULTS[provider]["model"]

    config.base_url, config.model = _normalize_provider_defaults(provider, config.base_url, config.model)

    if body.is_active is True:
        _set_active_llm_config(db, config.id)
    elif body.is_active is False:
        config.is_active = False

    db.commit()
    db.refresh(config)
    return _serialize_llm_config(config)


@router.post("/llm-configs/{config_id}/activate")
def activate_llm_config(config_id: uuid.UUID, db: Session = Depends(get_db), _: str = Depends(get_admin)):
    config = db.query(LLMConfig).filter(LLMConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="LLM config not found")
    _set_active_llm_config(db, config.id)
    db.commit()
    db.refresh(config)
    return _serialize_llm_config(config)


@router.delete("/llm-configs/{config_id}")
def delete_llm_config(config_id: uuid.UUID, db: Session = Depends(get_db), _: str = Depends(get_admin)):
    config = db.query(LLMConfig).filter(LLMConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="LLM config not found")
    db.delete(config)
    db.commit()
    return {"ok": True}


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _: str = Depends(get_admin)):
    boss = db.query(Boss).filter(Boss.status == "current").first()
    total_users = db.query(func.count(User.id)).scalar()
    total_submissions = db.query(func.count(Submission.id)).scalar()
    total_approvals = db.query(func.count(BossResponse.id)).filter(BossResponse.approved == True).scalar()
    defeats = db.query(BossDefeat).order_by(BossDefeat.defeated_at).all()
    return {
        "current_boss": {"name": boss.name, "status": boss.status} if boss else None,
        "total_users": total_users,
        "total_submissions": total_submissions,
        "total_approvals": total_approvals,
        "world_first_defeats": [
            {
                "boss_name": d.boss.name,
                "winner": d.user.display_name,
                "defeated_at": d.defeated_at.isoformat(),
            }
            for d in defeats
        ],
    }


@router.get("/bosses")
def list_bosses(db: Session = Depends(get_db), _: str = Depends(get_admin)):
    bosses = db.query(Boss).order_by(Boss.order_index).all()
    return [
        {
            "id": str(b.id),
            "name": b.name,
            "slug": b.slug,
            "status": b.status,
            "order_index": b.order_index,
            "rudeness_level": b.rudeness_level,
            "defeat": {
                "winner": b.defeat.user.display_name,
                "defeated_at": b.defeat.defeated_at.isoformat(),
            } if b.defeat else None,
        }
        for b in bosses
    ]


class AdjustPointsRequest(BaseModel):
    delta: int  # positive = add, negative = deduct


@router.patch("/users/{user_id}/points")
def adjust_user_points(
    user_id: uuid.UUID,
    body: AdjustPointsRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin),
):
    if body.delta == 0:
        raise HTTPException(status_code=400, detail="delta cannot be 0")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.points = max(0, user.points + body.delta)
    db.add(PointTransaction(
        id=uuid.uuid4(),
        user_id=user.id,
        amount=body.delta,
        type="admin_adjustment",
    ))
    db.commit()
    db.refresh(user)
    return {"user_id": str(user.id), "points": user.points}


@router.get("/settings")
def get_settings(db: Session = Depends(get_db), _: str = Depends(get_admin)):
    from models.system_setting import SystemSetting
    rows = db.query(SystemSetting).all()
    return {r.key: r.value for r in rows}


@router.patch("/settings")
def update_settings(
    body: dict,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin),
):
    from models.system_setting import SystemSetting
    allowed_keys = {"difficulty_mode"}
    for key, value in body.items():
        if key not in allowed_keys:
            raise HTTPException(status_code=400, detail=f"Unknown setting key: {key}")
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if row:
            row.value = str(value)
        else:
            db.add(SystemSetting(key=key, value=str(value)))
    db.commit()
    rows = db.query(SystemSetting).all()
    return {r.key: r.value for r in rows}


class BossCreateRequest(BaseModel):
    name: str
    slug: str
    specialty: str
    obsession: str
    personality: str
    signature_attacks: list[str]
    approved_phrase: str
    order_index: int | None = None
    rudeness_level: int = 2
    status: str = "locked"


class BossPatchRequest(BaseModel):
    rudeness_level: int | None = None
    status: str | None = None
    order_index: int | None = None


@router.post("/bosses", status_code=201)
def create_boss(body: BossCreateRequest, db: Session = Depends(get_db), _: str = Depends(get_admin)):
    # Validate slug format
    if not re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$', body.slug):
        raise HTTPException(status_code=400, detail="slug must be lowercase alphanumeric with hyphens (e.g. 'my-boss')")

    if db.query(Boss).filter(Boss.slug == body.slug).first():
        raise HTTPException(status_code=409, detail=f"Boss with slug '{body.slug}' already exists")

    if body.rudeness_level not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="rudeness_level must be 1, 2, or 3")

    if body.status not in ("locked", "unlocked", "current", "defeated"):
        raise HTTPException(status_code=400, detail="status must be one of: locked, unlocked, current, defeated")

    # Auto-assign order_index if not provided
    order_index = body.order_index
    if order_index is None:
        max_order = db.query(func.max(Boss.order_index)).scalar() or 0
        order_index = max_order + 1

    # Write boss config JSON file so LLM evaluator can load it
    config = {
        "slug": body.slug,
        "name": body.name,
        "order_index": order_index,
        "specialty": body.specialty,
        "obsession": body.obsession,
        "personality": body.personality,
        "signature_attacks": body.signature_attacks,
        "approved_phrase": body.approved_phrase,
    }
    config_filename = body.slug.replace("-", "_") + ".json"
    config_path = os.path.join(settings.BOSS_CONFIGS_PATH, config_filename)
    os.makedirs(settings.BOSS_CONFIGS_PATH, exist_ok=True)
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    boss = Boss(
        id=uuid.uuid4(),
        name=body.name,
        slug=body.slug,
        order_index=order_index,
        specialty=body.specialty,
        status=body.status,
        rudeness_level=body.rudeness_level,
    )
    db.add(boss)

    # If setting as current, demote any existing current boss
    if body.status == "current":
        db.query(Boss).filter(Boss.slug != body.slug, Boss.status == "current").update({"status": "unlocked"})
        db.flush()
        pool = PrizePool(id=uuid.uuid4(), boss_id=boss.id, total_points=100)
        db.add(pool)

    db.commit()
    db.refresh(boss)

    return {
        "id": str(boss.id),
        "name": boss.name,
        "slug": boss.slug,
        "order_index": boss.order_index,
        "status": boss.status,
        "specialty": boss.specialty,
        "rudeness_level": boss.rudeness_level,
        "config_file": config_filename,
    }


@router.patch("/bosses/{slug}")
def patch_boss(slug: str, body: BossPatchRequest, db: Session = Depends(get_db), _: str = Depends(get_admin)):
    boss = db.query(Boss).filter(Boss.slug == slug).first()
    if not boss:
        raise HTTPException(status_code=404, detail="Boss not found")
    if body.rudeness_level is not None:
        if body.rudeness_level not in (1, 2, 3):
            raise HTTPException(status_code=400, detail="rudeness_level must be 1, 2, or 3")
        boss.rudeness_level = body.rudeness_level
    if body.status is not None:
        boss.status = body.status
    if body.order_index is not None:
        boss.order_index = body.order_index
    db.commit()
    return {"ok": True}


@router.post("/bosses/{slug}/activate")
def activate_boss(slug: str, db: Session = Depends(get_db), _: str = Depends(get_admin)):
    # Set all current bosses to unlocked, then set target to current
    db.query(Boss).filter(Boss.status == "current").update({"status": "unlocked"})
    boss = db.query(Boss).filter(Boss.slug == slug).first()
    if not boss:
        raise HTTPException(status_code=404, detail="Boss not found")
    boss.status = "current"
    # Ensure prize pool exists
    pool = db.query(PrizePool).filter(PrizePool.boss_id == boss.id).first()
    if not pool:
        db.add(PrizePool(id=uuid.uuid4(), boss_id=boss.id, total_points=100))
    db.commit()
    return {"ok": True}


@router.post("/bosses/{slug}/reset")
def reset_boss(slug: str, db: Session = Depends(get_db), _: str = Depends(get_admin)):
    boss = db.query(Boss).filter(Boss.slug == slug).first()
    if not boss:
        raise HTTPException(status_code=404, detail="Boss not found")
    db.query(BossDefeat).filter(BossDefeat.boss_id == boss.id).delete()
    pool = db.query(PrizePool).filter(PrizePool.boss_id == boss.id).first()
    if pool:
        pool.settled = False
        pool.winner_user_id = None
        pool.settled_at = None
    boss.status = "unlocked"
    db.commit()
    return {"ok": True}


@router.get("/submissions")
def list_submissions(
    boss: str | None = None,
    approved: bool | None = None,
    page: int = 1,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin),
):
    q = db.query(Submission)
    if boss:
        boss_obj = db.query(Boss).filter(Boss.slug == boss).first()
        if boss_obj:
            q = q.filter(Submission.boss_id == boss_obj.id)
    if approved is not None:
        q = q.join(BossResponse).filter(BossResponse.approved == approved)
    total = q.count()
    subs = q.order_by(Submission.created_at.desc()).offset((page - 1) * 20).limit(20).all()
    return {
        "total": total,
        "page": page,
        "items": [
            {
                "submission_id": str(s.id),
                "user_handle": s.user.display_name,
                "boss_name": s.boss.name,
                "version_number": s.version_number,
                "mood": s.boss_response.mood if s.boss_response else None,
                "approved": s.boss_response.approved if s.boss_response else False,
                "created_at": s.created_at.isoformat(),
            }
            for s in subs
        ],
    }


@router.get("/submissions/{submission_id}")
def get_submission_detail(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin),
):
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")
    r = s.boss_response
    return {
        "submission_id": str(s.id),
        "user_handle": s.user.display_name,
        "boss_name": s.boss.name,
        "version_number": s.version_number,
        "extracted_text": s.extracted_text,
        "boss_response": {
            "roast_opening": r.roast_opening,
            "why_it_fails": r.why_it_fails,
            "top_issues": json.loads(r.top_issues_json),
            "fix_direction": r.fix_direction,
            "mood": r.mood,
            "approved": r.approved,
            "raw_llm_response": r.raw_llm_response,
        } if r else None,
    }


@router.get("/users")
def list_users(page: int = 1, db: Session = Depends(get_db), _: str = Depends(get_admin)):
    total = db.query(func.count(User.id)).scalar()
    users = db.query(User).order_by(User.created_at.desc()).offset((page - 1) * 20).limit(20).all()
    return {
        "total": total,
        "page": page,
        "items": [
            {
                "user_id": str(u.id),
                "display_name": u.display_name,
                "email": u.email,
                "points": u.points,
                "total_submissions": len(u.submissions),
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
    }


@router.get("/users/{user_id}/submissions")
def get_user_submissions(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin),
):
    subs = db.query(Submission).filter(Submission.user_id == user_id).order_by(Submission.created_at.desc()).all()
    return [
        {
            "submission_id": str(s.id),
            "boss_name": s.boss.name,
            "version_number": s.version_number,
            "mood": s.boss_response.mood if s.boss_response else None,
            "approved": s.boss_response.approved if s.boss_response else False,
            "created_at": s.created_at.isoformat(),
        }
        for s in subs
    ]


@router.delete("/leaderboard/{defeat_id}")
def delete_leaderboard_entry(
    defeat_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: str = Depends(get_admin),
):
    entry = db.query(BossDefeat).filter(BossDefeat.id == defeat_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}


@router.post("/super-auth")
def super_admin_login(body: AdminLoginRequest):
    """Hidden endpoint — not documented. Validates super admin password and returns short-lived token."""
    if not settings.SUPER_ADMIN_PASSWORD_HASH or not settings.SUPER_ADMIN_SECRET_KEY:
        raise HTTPException(status_code=404, detail="Not found")
    if not verify_password(body.password, settings.SUPER_ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    from core.security import create_super_token
    return {"super_token": create_super_token()}


class SuperRudenessRequest(BaseModel):
    enable: bool


@router.post("/bosses/{slug}/super-rudeness")
def set_super_rudeness(
    slug: str,
    body: SuperRudenessRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_super_admin),
):
    """Hidden endpoint — sets rudeness_level to 4 (unleashed) or resets to 2."""
    boss = db.query(Boss).filter(Boss.slug == slug).first()
    if not boss:
        raise HTTPException(status_code=404, detail="Boss not found")
    boss.rudeness_level = 4 if body.enable else 2
    db.commit()
    return {"slug": slug, "rudeness_level": boss.rudeness_level}


@router.post("/factory-reset")
def factory_reset(db: Session = Depends(get_db), _: str = Depends(get_admin)):
    """
    Wipe all user-generated data and restore bosses to initial state.
    Deletes: BossResponse, PointTransaction, BossDefeat, Submission, PrizePool, User.
    Resets: all bosses to locked except order_index=1 which becomes current,
    rudeness_level back to 2, creates fresh prize pools with 100 points.
    LLM configs are preserved.
    """
    db.query(BossResponse).delete()
    db.query(PointTransaction).delete()
    db.query(BossDefeat).delete()
    db.query(Submission).delete()
    db.query(PrizePool).delete()
    db.query(User).delete()

    bosses = db.query(Boss).order_by(Boss.order_index).all()
    for boss in bosses:
        boss.rudeness_level = 2
        if boss.order_index == 1:
            boss.status = "current"
        else:
            boss.status = "locked"
        pool = PrizePool(id=uuid.uuid4(), boss_id=boss.id, total_points=100)
        db.add(pool)

    db.commit()
    return {"ok": True, "message": "Factory reset complete. All user data wiped, bosses restored."}


@router.post("/force-defeat-current-boss")
def force_defeat_current_boss(db: Session = Depends(get_db), _: str = Depends(get_admin)):
    """
    Admin tool: force-defeat the current boss and unlock the next one.
    Skips the BossDefeat record (no user/submission). Useful for testing boss progression.
    """
    boss = db.query(Boss).filter(Boss.status == "current").first()
    if not boss:
        raise HTTPException(status_code=404, detail="No active boss to defeat")

    pool = db.query(PrizePool).filter(PrizePool.boss_id == boss.id).first()
    if pool:
        pool.settled = True

    boss.status = "defeated"

    next_boss = db.query(Boss).filter(Boss.order_index == boss.order_index + 1).first()
    if next_boss:
        next_boss.status = "current"
        existing_pool = db.query(PrizePool).filter(PrizePool.boss_id == next_boss.id).first()
        if not existing_pool:
            db.add(PrizePool(id=uuid.uuid4(), boss_id=next_boss.id, total_points=100))

    db.commit()
    return {
        "ok": True,
        "defeated_boss": boss.name,
        "next_boss": next_boss.name if next_boss else None,
    }
