from sqlalchemy import Boolean, Column, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PolicyConfig(Base):
    __tablename__ = "policy_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    risk_threshold: Mapped[int] = mapped_column(Integer, default=70, nullable=False)
    require_trusted_device_for_high_sensitivity: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    require_mfa_for_high_sensitivity: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)