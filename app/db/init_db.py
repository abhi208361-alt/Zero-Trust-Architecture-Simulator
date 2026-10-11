from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.policy import PolicyConfig
from app.models.user import User, UserRole
from app.services.security import get_password_hash


DEFAULT_USERS = [
    {
        "username": "viewer",
        "email": "viewer@example.local",
        "full_name": "Viewer User",
        "role": UserRole.VIEWER,
        "password": "viewer123!",
    },
    {
        "username": "analyst",
        "email": "analyst@example.local",
        "full_name": "Analyst User",
        "role": UserRole.ANALYST,
        "password": "analyst123!",
    },
    {
        "username": "admin",
        "email": "admin@example.local",
        "full_name": "Administrator User",
        "role": UserRole.ADMINISTRATOR,
        "password": "admin123!",
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
