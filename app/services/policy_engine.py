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

    if actor is None:
        return PolicyDecision(
            decision="deny",
            reason="identity not found",
            checks=["identity lookup failed"],
            risk_score=request.simulated_risk_score,
            timestamp=datetime.now(UTC),
            correlation_id=correlation_id,
            user=request.username,
            resource=request.resource,
            action=request.action,
        )

    if not actor.is_active:
        return PolicyDecision(
            decision="deny",
            reason="account disabled",
            checks=["account status inactive"],
            risk_score=request.simulated_risk_score,
            timestamp=datetime.now(UTC),
            correlation_id=correlation_id,
            user=actor.username,
            resource=request.resource,
            action=request.action,
        )

    if not token_valid:
        return PolicyDecision(
            decision="deny",
            reason="token invalid",
            checks=["token validity failed"],
            risk_score=request.simulated_risk_score,
            timestamp=datetime.now(UTC),
            correlation_id=correlation_id,
            user=actor.username,
            resource=request.resource,
            action=request.action,
        )

    policy = db.scalar(select(PolicyConfig).where(PolicyConfig.id == 1))
    if policy is None:
        policy = PolicyConfig(id=1)
        db.add(policy)
        db.commit()
        db.refresh(policy)

    sensitivity = RESOURCE_SENSITIVITY.get(request.resource)
    if not sensitivity:
        return PolicyDecision(
            decision="deny",
            reason="unknown resource",
            checks=["resource is not registered"],
            risk_score=request.simulated_risk_score,
            timestamp=datetime.now(UTC),
            correlation_id=correlation_id,
            user=actor.username,
            resource=request.resource,
            action=request.action,
        )

    checks.append(f"resource sensitivity={sensitivity} (simulated policy metadata)")
    checks.append(f"device_trusted={request.simulated_device_trusted} (simulated signal)")
    checks.append(f"mfa_passed={request.simulated_mfa_passed} (simulated signal)")

    allowed, reason = has_permission(actor.role, request.resource, request.action)
    if not allowed:
        return PolicyDecision(
            decision="deny",
            reason=reason,
            checks=checks + ["RBAC check failed"],
            risk_score=request.simulated_risk_score,
            timestamp=datetime.now(UTC),
            correlation_id=correlation_id,
            user=actor.username,
            resource=request.resource,
            action=request.action,
        )

    if sensitivity == "high" and policy.require_trusted_device_for_high_sensitivity and not request.simulated_device_trusted:
        return PolicyDecision(
            decision="deny",
            reason="trusted device required",
            checks=checks + ["high sensitivity trusted-device requirement failed"],
            risk_score=request.simulated_risk_score,
            timestamp=datetime.now(UTC),
            correlation_id=correlation_id,
            user=actor.username,
            resource=request.resource,
            action=request.action,
        )

    if sensitivity == "high" and policy.require_mfa_for_high_sensitivity and not request.simulated_mfa_passed:
        return PolicyDecision(
            decision="deny",
            reason="mfa required",
            checks=checks + ["high sensitivity MFA requirement failed"],
            risk_score=request.simulated_risk_score,
            timestamp=datetime.now(UTC),
            correlation_id=correlation_id,
            user=actor.username,
            resource=request.resource,
            action=request.action,
        )

    if request.simulated_risk_score > policy.risk_threshold:
        return PolicyDecision(
            decision="deny",
            reason="risk threshold exceeded",
            checks=checks + [f"risk score {request.simulated_risk_score} > threshold {policy.risk_threshold}"],
            risk_score=request.simulated_risk_score,
            timestamp=datetime.now(UTC),
            correlation_id=correlation_id,
            user=actor.username,
            resource=request.resource,
            action=request.action,
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
    )