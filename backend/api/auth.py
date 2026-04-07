from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from core.database import get_db
from services.auth_service import register_user, login_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if len(body.password) < 8:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    return register_user(db, body.email, body.password, body.display_name)


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db, body.email, body.password)
