from __future__ import annotations

from collections import defaultdict
from threading import Lock
from time import monotonic

from fastapi import Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.models.user import User, UserRole


class RateLimiter:
    def __init__(self) -> None:
        self._lock = Lock()
        self._attempts: dict[tuple[str, str], list[float]] = defaultdict(list)

    def clear(self) -> None:
        with self._lock:
            self._attempts.clear()

    def check(self, key: str, bucket: str, limit: int, window_seconds: int) -> None:
        now = monotonic()
        window_start = now - window_seconds
        with self._lock:
            attempts = [timestamp for timestamp in self._attempts[(bucket, key)] if timestamp > window_start]
            if len(attempts) >= limit:
                retry_after = max(1, int(attempts[0] + window_seconds - now + 0.999))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={"Retry-After": str(retry_after)},
                )
            attempts.append(now)
            self._attempts[(bucket, key)] = attempts


rate_limiter = RateLimiter()


def _client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def enforce_auth_rate_limit(request: Request) -> None:
    settings = get_settings()
    rate_limiter.check(
        _client_key(request),
        "auth",
        settings.AUTH_RATE_LIMIT_ATTEMPTS,
        settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    )


def enforce_admin_rate_limit(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> None:
    if current_user.role != UserRole.ADMINISTRATOR:
        return
    settings = get_settings()
    rate_limiter.check(
        f"{current_user.username}:{_client_key(request)}",
        "admin",
        settings.ADMIN_RATE_LIMIT_ATTEMPTS,
        settings.ADMIN_RATE_LIMIT_WINDOW_SECONDS,
    )
