from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.policy import PolicyConfig
from app.models.user import User
from app.schemas.policy import PolicyDecision, PolicyEvaluationRequest
from app.services.rbac import RESOURCE_SENSITIVITY, has_permission


def evaluate_request(
    db: Session,
    actor: User | None,
    request: PolicyEvaluationRequest,
    token_valid: bool,
) -> PolicyDecision:
    checks: list[str] = []
    correlation_id = uuid4().hex

    def decision(reason: str, failed: list[str] | None = None, result: str = "deny") -> PolicyDecision:
        failed_checks = failed or [reason]
        return PolicyDecision(
            decision=result,
            reason=reason,
            checks=checks + failed_checks,
            failed_checks=failed_checks,
            applied_policies=["default-deny", "rbac", "contextual-risk"],
            explanation=reason,
            risk_score=request.simulated_risk_score,
            timestamp=datetime.now(UTC),
            correlation_id=correlation_id,
            request_id=correlation_id,
            user=actor.username if actor else request.username,
            resource=request.resource,
            action=request.action,
        )

    if actor is None:
        return decision("identity not found", ["identity lookup failed"])

    if not actor.is_active:
        return decision("account disabled", ["account status inactive"])

    if not token_valid:
        return decision("token invalid", ["token validity failed"])

    policy = db.scalar(select(PolicyConfig).where(PolicyConfig.id == 1))
    if policy is None:
        policy = PolicyConfig(id=1)
        db.add(policy)
        db.commit()
        db.refresh(policy)

    sensitivity = RESOURCE_SENSITIVITY.get(request.resource)
    if not sensitivity:
        return decision("unknown resource", ["resource is not registered"])

    checks.append(f"resource sensitivity={sensitivity} (simulated policy metadata)")
    checks.append(f"device_trusted={request.simulated_device_trusted} (simulated signal)")
    checks.append(f"mfa_passed={request.simulated_mfa_passed} (simulated signal)")

    allowed, reason = has_permission(actor.role, request.resource, request.action)
    if not allowed:
        return decision(reason, ["RBAC check failed"])

    if sensitivity == "high" and policy.require_trusted_device_for_high_sensitivity and not request.simulated_device_trusted:
        return decision(
            "trusted device required",
            ["high sensitivity trusted-device requirement failed"],
            "step_up_authentication",
        )

    if sensitivity == "high" and policy.require_mfa_for_high_sensitivity and not request.simulated_mfa_passed:
        return decision("mfa required", ["high sensitivity MFA requirement failed"], "require_mfa")

    if request.simulated_risk_score > policy.risk_threshold:
        return decision(
            "risk threshold exceeded",
            [f"risk score {request.simulated_risk_score} > threshold {policy.risk_threshold}"],
            "deny",
        )

    return PolicyDecision(
        decision="allow",
        reason="all zero-trust checks passed",
        checks=checks + ["RBAC and policy checks passed"],
        risk_score=request.simulated_risk_score,
        timestamp=datetime.now(UTC),
        correlation_id=correlation_id,
        user=actor.username,
        resource=request.resource,
        action=request.action,
        request_id=correlation_id,
        applied_policies=["default-deny", "rbac", "contextual-risk"],
        explanation="all zero-trust checks passed",
    )