from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PolicyEvaluationRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    resource: str = Field(min_length=2, max_length=120)
    action: str = Field(min_length=2, max_length=80)
    simulated_device_trusted: bool = True
    simulated_mfa_passed: bool = False
    simulated_risk_score: int = Field(default=0, ge=0, le=100)


class PolicyDecision(BaseModel):
    decision: Literal["allow", "deny"]
    reason: str
    checks: list[str]
    risk_score: int
    timestamp: datetime
    correlation_id: str
    user: str
    resource: str
    action: str
