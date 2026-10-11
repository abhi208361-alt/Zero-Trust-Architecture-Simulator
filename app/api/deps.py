from collections import defaultdict, deque
from datetime import UTC, datetime
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User, UserRole
from app.services.audit import write_audit_log
from app.services.security import decode_token, is_token_revoked

failed_attempts: dict[str, deque[datetime]] = defaultdict(deque)


DbDep = Annotated[Session, Depends(get_db)]


def check_rate_limit(identifier: str) -> None:
    settings = get_settings()
    now = datetime.now(UTC)
    window_start = now.timestamp() - settings.auth_rate_limit_window_seconds
    attempts = failed_attempts[identifier]
    while attempts and attempts[0].timestamp() < window_start:
        attempts.popleft()
    if len(attempts) >= settings.auth_rate_limit_attempts:
        raise HTTPException(status_code=429, detail="Too many failed login attempts")


def mark_failed_attempt(identifier: str) -> None:
    failed_attempts[identifier].append(datetime.now(UTC))


def clear_failed_attempts(identifier: str) -> None:
    failed_attempts.pop(identifier, None)


def get_current_user(
    db: DbDep,
    request: Request,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if payload.get("token_type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    jti = payload.get("jti")
    if not jti or is_token_revoked(db, jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked")

    user = db.scalar(select(User).where(User.username == payload.get("sub")))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    if not user.is_active:
        write_audit_log(
            db,
            correlation_id=request.headers.get("x-correlation-id", "disabled-account"),
            event_type="authentication",
            actor_id=user.id,
            actor_username=user.username,
            resource="auth",
            action="token_validate",
            result="deny",
            reason="disabled account",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def require_role(*allowed_roles: UserRole):
    def _checker(user: CurrentUserDep) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return _checker
