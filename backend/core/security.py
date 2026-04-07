from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(subject: str, secret: str, expire_days: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=expire_days)
    return jwt.encode({"sub": subject, "exp": expire}, secret, algorithm="HS256")


def create_user_token(user_id: str) -> str:
    return create_token(user_id, settings.JWT_SECRET_KEY, settings.JWT_EXPIRE_DAYS)


def create_admin_token() -> str:
    return create_token("admin", settings.ADMIN_SECRET_KEY, 1)


def decode_user_token(token: str) -> str:
    payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
    return payload["sub"]


def decode_admin_token(token: str) -> str:
    payload = jwt.decode(token, settings.ADMIN_SECRET_KEY, algorithms=["HS256"])
    return payload["sub"]
