from datetime import UTC, datetime
from uuid import uuid4

import jwt
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.auth import RevokedToken
from app.models.user import User

settings = get_settings()
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str, session_version: int = 0) -> str:
    payload = {
        "sub": subject,
        "iat": datetime.now(UTC),
        "jti": uuid4().hex,
        "token_type": "access",  # nosec B105
        "session_version": session_version,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["sub", "iat", "jti"]},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == username))


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = get_user_by_username(db, username)
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def revoke_token(db: Session, token: str) -> None:
    payload = decode_access_token(token)
    jti = payload["jti"]
    expires_at = (
        datetime.fromtimestamp(payload["exp"], UTC)
        if payload.get("exp") is not None
        else datetime.max.replace(tzinfo=UTC)
    )
    if db.scalar(select(RevokedToken).where(RevokedToken.jti == jti)) is None:
        db.add(RevokedToken(jti=jti, expires_at=expires_at))
        db.commit()


def is_token_revoked(db: Session, jti: str) -> bool:
    now = datetime.now(UTC)
    db.query(RevokedToken).filter(RevokedToken.expires_at < now).delete()
    db.commit()
    return db.scalar(select(RevokedToken).where(RevokedToken.jti == jti)) is not None