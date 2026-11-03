import enum

from sqlalchemy import Boolean, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class UserRole(str, enum.Enum):
    VIEWER = "viewer"
    ANALYST = "analyst"
    ADMINISTRATOR = "administrator"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    theme: Mapped[str] = mapped_column(String(20), nullable=False, default="system")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    notification_preferences: Mapped[str] = mapped_column(String, nullable=False, default="{}")
    session_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)