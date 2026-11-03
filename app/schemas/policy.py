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
    decision: Literal["allow", "deny", "require_mfa", "require_reauthentication", "step_up_authentication"]
    reason: str
    checks: list[str]
    risk_score: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    correlation_id: str
    user: str
    resource: str
    action: str
    request_id: str | None = None
    applied_policies: list[str] = Field(default_factory=list)
    failed_checks: list[str] = Field(default_factory=list)
    explanation: str | None = None

    def model_dump_json(self) -> str:
        data = self.model_dump()
        data["timestamp"] = self.timestamp.isoformat()
        return data


class PolicyConfigUpdate(BaseModel):
    risk_threshold: int = Field(default=70, ge=0, le=100)
    require_trusted_device_for_high_sensitivity: bool = True
    require_mfa_for_high_sensitivity: bool = False


class PolicyRuleRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    tenant: str = Field(default="default", min_length=1, max_length=80)
    description: str = Field(default="", max_length=1000)
    effect: Literal["allow", "deny"] = "deny"
    priority: int = Field(default=100, ge=0, le=10000)
    identities: list[str] = Field(default_factory=list)
    resources: list[str] = Field(default_factory=list)
    actions: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    enabled: bool = True