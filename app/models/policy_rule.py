import sqlalchemy
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PolicyEffect(str, Enum):
    ALLOW = "allow"
    DENY = "deny"


class PolicyRule(Base):
    __tablename__ = "policy_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    tenant: Mapped[str] = mapped_column(String(80), default="default", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    effect: Mapped[PolicyEffect] = mapped_column(
        sqlalchemy.Enum(PolicyEffect),
        nullable=False,
        default=PolicyEffect.DENY,
    )
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    identities: Mapped[str] = mapped_column(Text, default="", nullable=False)
    resources: Mapped[str] = mapped_column(Text, default="", nullable=False)
    actions: Mapped[str] = mapped_column(Text, default="", nullable=False)
    conditions: Mapped[str] = mapped_column(Text, default="", nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )