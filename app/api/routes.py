from collections import Counter
from datetime import UTC, datetime
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import func, select

from app.api.deps import (
    CurrentUserDep,
    DbDep,
    check_rate_limit,
    clear_failed_attempts,
    mark_failed_attempt,
    require_role,
)
from app.models.audit import AuditLog
from app.models.policy import PolicyConfig
from app.models.user import User, UserRole
from app.schemas.audit import AuditLogResponse, AuditSummaryResponse
from app.schemas.auth import LoginRequest, TokenResponse, UserCreateRequest, UserResponse, UserUpdateRequest
from app.schemas.dashboard import DashboardMetrics
from app.schemas.policy import PolicyDecision, PolicyEvaluationRequest
from app.services.audit import get_audit_summary, write_audit_log
from app.services.policy_engine import evaluate_request
from app.services.rbac import RESOURCE_ACTION_PERMISSION, RESOURCE_SENSITIVITY, ROLE_PERMISSIONS
from app.services.security import create_access_token, decode_token, revoke_token, verify_password

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbDep, request: Request) -> TokenResponse:
    identifier = f"{payload.username}:{request.client.host if request.client else 'local'}"
    check_rate_limit(identifier)

    user = db.scalar(select(User).where(User.username == payload.username))
    if not user or not verify_password(payload.password, user.password_hash):
        mark_failed_attempt(identifier)
        write_audit_log(
            db,
            correlation_id=request.headers.get("x-correlation-id", "login-failed"),
            event_type="authentication",
            actor_id=user.id if user else None,
            actor_username=user.username if user else payload.username,
            resource="auth",
            action="login",
            result="deny",
            reason="invalid credentials",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        mark_failed_attempt(identifier)
        write_audit_log(
            db,
            correlation_id=request.headers.get("x-correlation-id", "login-disabled"),
            event_type="authentication",
            actor_id=user.id,
            actor_username=user.username,
            resource="auth",
            action="login",
            result="deny",
            reason="disabled account",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    clear_failed_attempts(identifier)
    token, expires_at, _ = create_access_token(user.username)
    write_audit_log(
        db,
        correlation_id=request.headers.get("x-correlation-id", "login-success"),
        event_type="authentication",
        actor_id=user.id,
        actor_username=user.username,
        resource="auth",
        action="login",
        result="allow",
        reason="login successful",
    )
    return TokenResponse(access_token=token, expires_at=expires_at)


@router.post("/auth/logout")
def logout(
    user: CurrentUserDep,
    db: DbDep,
    request: Request,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> dict[str, str]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        payload = decode_token(authorization.removeprefix("Bearer ").strip())
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    revoke_token(db, payload["jti"], datetime.fromtimestamp(payload["exp"], tz=UTC))
    write_audit_log(
        db,
        correlation_id=request.headers.get("x-correlation-id", "logout"),
        event_type="authentication",
        actor_id=user.id,
        actor_username=user.username,
        resource="auth",
        action="logout",
        result="allow",
        reason="logout successful",
    )
    return {"message": "Logged out"}


@router.get("/auth/me", response_model=UserResponse)
def me(user: CurrentUserDep) -> UserResponse:
    return UserResponse.model_validate(user)


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: DbDep,
    user: Annotated[User, Depends(require_role(UserRole.ADMINISTRATOR))],
) -> list[UserResponse]:
    records = db.scalars(select(User).order_by(User.id)).all()
    return [UserResponse.model_validate(r) for r in records]


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    payload: UserCreateRequest,
    db: DbDep,
    request: Request,
    actor: Annotated[User, Depends(require_role(UserRole.ADMINISTRATOR))],
) -> UserResponse:
    from app.services.security import get_password_hash

    if db.scalar(select(User).where(User.username == payload.username)):
        raise HTTPException(status_code=409, detail="Username already exists")
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status_code=409, detail="Email already exists")
    new_user = User(
        username=payload.username,
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    write_audit_log(
        db,
        correlation_id=request.headers.get("x-correlation-id", "user-create"),
        event_type="user_admin",
        actor_id=actor.id,
        actor_username=actor.username,
        resource="users",
        action="manage",
        result="allow",
        reason=f"created user {new_user.username}",
    )
    return UserResponse.model_validate(new_user)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    db: DbDep,
    request: Request,
    actor: CurrentUserDep,
) -> UserResponse:
    target = db.scalar(select(User).where(User.id == user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if actor.role != UserRole.ADMINISTRATOR:
        write_audit_log(
            db,
            correlation_id=request.headers.get("x-correlation-id", "user-update-denied"),
            event_type="user_admin",
            actor_id=actor.id,
            actor_username=actor.username,
            resource="users",
            action="manage",
            result="deny",
            reason="insufficient permissions",
        )
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    if payload.role is not None:
        target.role = payload.role
    if payload.is_active is not None:
        target.is_active = payload.is_active
    db.commit()
    db.refresh(target)
    write_audit_log(
        db,
        correlation_id=request.headers.get("x-correlation-id", "user-update"),
        event_type="user_admin",
        actor_id=actor.id,
        actor_username=actor.username,
        resource="users",
        action="manage",
        result="allow",
        reason=f"updated user {target.username}",
    )
    return UserResponse.model_validate(target)


@router.get("/rbac/matrix")
def rbac_matrix() -> dict:
    return {
        "role_permissions": {k.value: sorted(v) for k, v in ROLE_PERMISSIONS.items()},
        "resource_action_permissions": {
            f"{resource}:{action}": permission for (resource, action), permission in RESOURCE_ACTION_PERMISSION.items()
        },
        "resource_sensitivity": RESOURCE_SENSITIVITY,
    }


@router.post("/policy/evaluate", response_model=PolicyDecision)
def evaluate_policy(payload: PolicyEvaluationRequest, db: DbDep, request: Request, user: CurrentUserDep) -> PolicyDecision:
    actor = db.scalar(select(User).where(User.username == payload.username))
    decision = evaluate_request(db, actor, payload, token_valid=True)
    write_audit_log(
        db,
        correlation_id=decision.correlation_id,
        event_type="policy_decision",
        actor_id=user.id,
        actor_username=user.username,
        resource=payload.resource,
        action=payload.action,
        result=decision.decision,
        reason=decision.reason,
        risk_score=decision.risk_score,
        metadata={"checks": decision.checks, "simulated": True},
    )
    return decision


@router.get("/policy/config")
def get_policy_config(db: DbDep, _: CurrentUserDep) -> dict:
    config = db.scalar(select(PolicyConfig).where(PolicyConfig.id == 1))
    if config is None:
        config = PolicyConfig(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    return {
        "risk_threshold": config.risk_threshold,
        "require_trusted_device_for_high_sensitivity": config.require_trusted_device_for_high_sensitivity,
        "require_mfa_for_high_sensitivity": config.require_mfa_for_high_sensitivity,
    }


@router.put("/policy/config")
def update_policy_config(
    payload: dict,
    db: DbDep,
    request: Request,
    actor: Annotated[User, Depends(require_role(UserRole.ADMINISTRATOR))],
) -> dict:
    config = db.scalar(select(PolicyConfig).where(PolicyConfig.id == 1))
    if config is None:
        config = PolicyConfig(id=1)
        db.add(config)

    risk_threshold = int(payload.get("risk_threshold", config.risk_threshold))
    if risk_threshold < 0 or risk_threshold > 100:
        raise HTTPException(status_code=422, detail="risk_threshold must be between 0 and 100")

    config.risk_threshold = risk_threshold
    config.require_trusted_device_for_high_sensitivity = bool(
        payload.get("require_trusted_device_for_high_sensitivity", config.require_trusted_device_for_high_sensitivity)
    )
    config.require_mfa_for_high_sensitivity = bool(payload.get("require_mfa_for_high_sensitivity", config.require_mfa_for_high_sensitivity))
    db.commit()

    write_audit_log(
        db,
        correlation_id=request.headers.get("x-correlation-id", "policy-update"),
        event_type="policy_change",
        actor_id=actor.id,
        actor_username=actor.username,
        resource="policy",
        action="manage",
        result="allow",
        reason="policy config updated",
        metadata={
            "risk_threshold": config.risk_threshold,
            "require_trusted_device_for_high_sensitivity": config.require_trusted_device_for_high_sensitivity,
            "require_mfa_for_high_sensitivity": config.require_mfa_for_high_sensitivity,
        },
    )
    return {
        "message": "Policy updated",
        "risk_threshold": config.risk_threshold,
        "require_trusted_device_for_high_sensitivity": config.require_trusted_device_for_high_sensitivity,
        "require_mfa_for_high_sensitivity": config.require_mfa_for_high_sensitivity,
    }


@router.get("/resources")
def list_resources(_: CurrentUserDep) -> dict:
    return {"resources": RESOURCE_SENSITIVITY}


@router.post("/resources/access")
def resource_access(payload: PolicyEvaluationRequest, db: DbDep, user: CurrentUserDep) -> dict:
    actor = db.scalar(select(User).where(User.username == payload.username))
    decision = evaluate_request(db, actor, payload, token_valid=True)
    write_audit_log(
        db,
        correlation_id=decision.correlation_id,
        event_type="resource_access",
        actor_id=user.id,
        actor_username=user.username,
        resource=payload.resource,
        action=payload.action,
        result=decision.decision,
        reason=decision.reason,
        risk_score=decision.risk_score,
        metadata={"checks": decision.checks, "simulated": True},
    )
    if decision.decision == "deny":
        raise HTTPException(status_code=403, detail={"reason": decision.reason, "decision": decision.model_dump()})
    return {"message": "Access granted", "decision": decision.model_dump()}


@router.get("/audit/logs", response_model=list[AuditLogResponse])
def read_audit_logs(
    db: DbDep,
    _: Annotated[User, Depends(require_role(UserRole.ANALYST, UserRole.ADMINISTRATOR))],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    result: str | None = Query(default=None, pattern="^(allow|deny)$"),
    actor_username: str | None = None,
) -> list[AuditLogResponse]:
    query = select(AuditLog)
    if result:
        query = query.where(AuditLog.result == result)
    if actor_username:
        query = query.where(AuditLog.actor_username == actor_username)
    query = query.order_by(AuditLog.id.desc()).offset((page - 1) * page_size).limit(page_size)
    logs = db.scalars(query).all()
    return [AuditLogResponse(**{k: getattr(log, k) for k in AuditLogResponse.model_fields.keys()}) for log in logs]


@router.get("/audit/summary", response_model=AuditSummaryResponse)
def audit_summary(
    db: DbDep,
    _: Annotated[User, Depends(require_role(UserRole.ANALYST, UserRole.ADMINISTRATOR))],
) -> AuditSummaryResponse:
    return AuditSummaryResponse(**get_audit_summary(db))


@router.get("/dashboard/metrics", response_model=DashboardMetrics)
def dashboard_metrics(db: DbDep, _: CurrentUserDep) -> DashboardMetrics:
    total_access = db.scalar(select(func.count(AuditLog.id)).where(AuditLog.event_type.in_(["resource_access", "policy_decision"]))) or 0
    allowed = db.scalar(select(func.count(AuditLog.id)).where(AuditLog.result == "allow")) or 0
    denied = db.scalar(select(func.count(AuditLog.id)).where(AuditLog.result == "deny")) or 0

    users = db.scalars(select(User)).all()
    role_distribution = Counter([u.role.value for u in users])
    recent_logs = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(10)).all()

    return DashboardMetrics(
        total_access_requests=int(total_access),
        allowed_requests=int(allowed),
        denied_requests=int(denied),
        denial_percentage=round((denied / total_access * 100) if total_access else 0.0, 2),
        users_total=len(users),
        users_active=sum(1 for u in users if u.is_active),
        role_distribution=dict(role_distribution),
        recent_events=[
            {
                "timestamp": log.created_at.isoformat(),
                "event_type": log.event_type,
                "actor": log.actor_username,
                "resource": log.resource,
                "action": log.action,
                "result": log.result,
                "reason": log.reason,
            }
            for log in recent_logs
        ],
    )


@router.get("/security-tests/run")
def run_security_tests(db: DbDep, user: CurrentUserDep) -> dict:
    scenarios = [
        {
            "name": "viewer_allowed_public_read",
            "request": PolicyEvaluationRequest(
                username="viewer",
                resource="resources/public",
                action="read",
                simulated_device_trusted=True,
                simulated_risk_score=10,
            ),
            "expected": "allow",
        },
        {
            "name": "analyst_allowed_security_events",
            "request": PolicyEvaluationRequest(
                username="analyst",
                resource="resources/security-events",
                action="read",
                simulated_device_trusted=True,
                simulated_risk_score=15,
            ),
            "expected": "allow",
        },
        {
            "name": "viewer_denied_admin",
            "request": PolicyEvaluationRequest(
                username="viewer",
                resource="resources/admin",
                action="manage",
                simulated_device_trusted=True,
                simulated_risk_score=10,
            ),
            "expected": "deny",
        },
        {
            "name": "untrusted_device_denied_high_sensitivity",
            "request": PolicyEvaluationRequest(
                username="admin",
                resource="resources/admin",
                action="manage",
                simulated_device_trusted=False,
                simulated_risk_score=10,
            ),
            "expected": "deny",
        },
    ]

    results = []
    for scenario in scenarios:
        actor = db.scalar(select(User).where(User.username == scenario["request"].username))
        decision = evaluate_request(db, actor, scenario["request"], token_valid=True)
        passed = decision.decision == scenario["expected"]
        results.append(
            {
                "name": scenario["name"],
                "expected": scenario["expected"],
                "actual": decision.decision,
                "passed": passed,
                "reason": decision.reason,
                "checks": decision.checks,
            }
        )

    write_audit_log(
        db,
        correlation_id=f"security-tests-{datetime.now(UTC).timestamp()}",
        event_type="security_testing",
        actor_id=user.id,
        actor_username=user.username,
        resource="security-tests",
        action="run",
        result="allow",
        reason="predefined scenarios executed",
        metadata={"results": results},
    )
    return {"executed_at": datetime.now(UTC).isoformat(), "results": results}
