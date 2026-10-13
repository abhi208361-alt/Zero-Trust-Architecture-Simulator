from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.policy import PolicyConfig
from app.models.user import User, UserRole
from app.services.security import get_password_hash


def get_default_password(username: str) -> str:
    """Get default password for user from environment variables with fallback.

    Passwords are read from environment variables for security.
    Falls back to hardcoded defaults for development convenience.

    Environment variables expected:
        VIEWER_PASSWORD, ANALYST_PASSWORD, ADMIN_PASSWORD
    """
    passwords = {
        "viewer": getattr(get_settings(), "viewer_password", "viewer123!"),
        "analyst": getattr(get_settings(), "analyst_password", "analyst123!"),
        "admin": getattr(get_settings(), "admin_password", "admin123!"),
    }
    return passwords.get(username, "change-me-in-env")


DEFAULT_USERS = [
    {
        "username": "viewer",
        "email": "viewer@example.com",
        "full_name": "Viewer User",
        "role": UserRole.VIEWER,
        "password": get_default_password("viewer"),
    },
    {
        "username": "analyst",
        "email": "analyst@example.com",
        "full_name": "Analyst User",
        "role": UserRole.ANALYST,
        "password": get_default_password("analyst"),
    },
    {
        "username": "admin",
        "email": "admin@example.com",
        "full_name": "Administrator User",
        "role": UserRole.ADMINISTRATOR,
        "password": get_default_password("admin"),
    },
]


def init_defaults(db: Session) -> None:
    if db.scalar(select(PolicyConfig).limit(1)) is None:
        db.add(PolicyConfig(id=1))

    for user_data in DEFAULT_USERS:
        if db.scalar(select(User).where(User.username == user_data["username"])):
            continue
        db.add(
            User(
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                password_hash=get_password_hash(user_data["password"]),
                is_active=True,
            )
        )
    db.commit()
