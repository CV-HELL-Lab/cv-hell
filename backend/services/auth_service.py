from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models.user import User
from core.security import hash_password, verify_password, create_user_token
from core.config import settings
import uuid


def register_user(db: Session, email: str, password: str, display_name: str) -> dict:
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password(password),
        display_name=display_name,
        points=settings.INITIAL_POINTS,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "user_id": str(user.id),
        "display_name": user.display_name,
        "token": create_user_token(str(user.id)),
        "points": user.points,
    }


def login_user(db: Session, email: str, password: str) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return {
        "user_id": str(user.id),
        "display_name": user.display_name,
        "token": create_user_token(str(user.id)),
        "points": user.points,
    }
