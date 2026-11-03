from datetime import datetime, timezone
import json
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import Response, StreamingResponse
from pydantic import ValidationError
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.rate_limit import enforce_admin_rate_limit, enforce_auth_rate_limit, rate_limiter
from app.core.security import authenticate_user, create_access_token, get_password_hash, revoke_token, security
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.documentation import DocumentationPage
from app.models.policy import PolicyConfig
from app.models.policy_rule import PolicyEffect, PolicyRule
from app.models.user import User, UserRole
from app.schemas.auth import (
    LoginRequest,
    ProfileUpdateRequest,
    TokenResponse,
    UserCreateRequest,
    UserResponse,
    UserUpdateRequest,
)
from app.schemas.dashboard import DashboardMetrics
from app.schemas.policy import (
    PolicyConfigUpdate,
    PolicyDecision,
    PolicyEvaluationRequest,
    PolicyRuleRequest,
)
from app.services.audit import log_decision
from app.services.assistant import local_assistant_reply
from app.services.rbac import RESOURCE_ACTION_PERMISSION, RESOURCE_SENSITIVITY, ROLE_PERMISSIONS
from app.services.policy_engine import evaluate_request
from app.services.risk_scoring import compute_risk_score

router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/auth/login", response_model=TokenResponse, dependencies=[Depends(enforce_auth_rate_limit)])
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    existing_user = db.scalar(select(User).where(User.username == payload.username))
    if existing_user is not None and not existing_user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.username, user.session_version)
    return {
        "access_token": token,
        "token_type": "bearer",  # nosec B105
        "expires_at": datetime.now(timezone.utc),
    }


@router.get("/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/auth/me", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.email is not None:
        duplicate = db.scalar(
            select(User).where(User.email == payload.email, User.id != current_user.id)
        )
        if duplicate:
            raise HTTPException(status_code=400, detail="Email already exists")
        current_user.email = payload.email
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.password is not None:
        current_user.password_hash = get_password_hash(payload.password)
        current_user.session_version += 1
    db.commit()
    db.refresh(current_user)
    return current_user


def _notification_preferences(user: User) -> dict:
    try:
        value = json.loads(user.notification_preferences or "{}")
    except json.JSONDecodeError:
        value = {}
    return value if isinstance(value, dict) else {}


def _notification_response(log: AuditLog, read_ids: set[int]) -> dict:
    severity = "critical" if log.risk_score >= 80 else "high" if log.risk_score >= 60 else "info"
    return {
        "id": log.id,
        "title": f"{log.decision.title()} access decision",
        "description": log.reason,
        "resource": log.resource,
        "action": log.action,
        "severity": severity,
        "read": log.id in read_ids,
        "timestamp": log.timestamp.isoformat(),
    }


@router.get("/notifications")
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preferences = _notification_preferences(current_user)
    read_ids = {int(value) for value in preferences.get("read_ids", []) if str(value).isdigit()}
    query = db.query(AuditLog)
    if current_user.role != UserRole.ADMINISTRATOR:
        query = query.filter(AuditLog.user == current_user.username)
    logs = query.order_by(AuditLog.timestamp.desc()).limit(50).all()
    return [_notification_response(log, read_ids) for log in logs]


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = db.get(AuditLog, notification_id)
    if log is None or (
        current_user.role != UserRole.ADMINISTRATOR and log.user != current_user.username
    ):
        raise HTTPException(status_code=404, detail="Notification not found")
    preferences = _notification_preferences(current_user)
    read_ids = {int(value) for value in preferences.get("read_ids", []) if str(value).isdigit()}
    read_ids.add(notification_id)
    preferences["read_ids"] = sorted(read_ids)[-500:]
    current_user.notification_preferences = json.dumps(preferences)
    db.commit()
    return {"message": "Notification marked as read"}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog.id)
    if current_user.role != UserRole.ADMINISTRATOR:
        query = query.filter(AuditLog.user == current_user.username)
    ids = [row[0] for row in query.order_by(AuditLog.timestamp.desc()).limit(500).all()]
    preferences = _notification_preferences(current_user)
    existing_ids = {
        int(value) for value in preferences.get("read_ids", []) if str(value).isdigit()
    }
    preferences["read_ids"] = sorted(existing_ids.union(ids))[-500:]
    current_user.notification_preferences = json.dumps(preferences)
    db.commit()
    return {"message": "Notifications marked as read", "count": len(ids)}


@router.post("/auth/logout")
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    revoke_token(db, credentials.credentials)
    return {"message": "Logged out successfully"}


@router.post("/auth/register", dependencies=[Depends(enforce_auth_rate_limit)])
def register(payload: UserCreateRequest, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.username == payload.username))
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        display_name=payload.full_name,
        password_hash=get_password_hash(payload.password),
        role=UserRole.VIEWER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User registered successfully"}


@router.get("/users", response_model=list[UserResponse], dependencies=[Depends(enforce_admin_rate_limit)])
def list_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    users = db.query(User).all()
    return users


@router.patch("/users/{user_id}", response_model=UserResponse, dependencies=[Depends(enforce_admin_rate_limit)])
def update_user(user_id: int, payload: UserUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id and payload.is_active is False:
        raise HTTPException(status_code=400, detail="Administrators cannot disable their own account")
    is_admin_change = payload.is_active is False or (
        payload.role is not None and payload.role != UserRole.ADMINISTRATOR
    )
    if user.role == UserRole.ADMINISTRATOR and is_admin_change:
        active_admins = db.query(User).filter(
            User.role == UserRole.ADMINISTRATOR,
            User.is_active.is_(True),
        ).count()
        if active_admins <= 1:
            raise HTTPException(status_code=400, detail="The last active administrator must be preserved")
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.post("/policy/evaluate", response_model=PolicyDecision)
def evaluate_policy(
    payload: PolicyEvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.username != current_user.username:
        raise HTTPException(status_code=403, detail="Requests may only be made for the authenticated identity")
    decision = evaluate_request(db, current_user, payload, True)
    log_decision(db, current_user.username, payload.resource, payload.action, decision.decision, decision.reason, decision.risk_score)
    return decision


@router.post("/resources/access", response_model=PolicyDecision)
def request_resource_access(
    payload: PolicyEvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.username != current_user.username:
        raise HTTPException(status_code=403, detail="Requests may only be made for the authenticated identity")
    decision = evaluate_request(db, current_user, payload, True)
    log_decision(
        db,
        current_user.username,
        payload.resource,
        payload.action,
        decision.decision,
        decision.reason,
        decision.risk_score,
    )
    if decision.decision != "allow":
        raise HTTPException(status_code=403, detail=decision.reason)
    return decision


@router.get("/policy/config")
def get_policy_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(PolicyConfig).first()


@router.put("/policy/config", dependencies=[Depends(enforce_admin_rate_limit)])
def update_policy_config(
    payload: PolicyConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    config = db.query(PolicyConfig).first()
    if config is None:
        config = PolicyConfig()
        db.add(config)
    config.risk_threshold = payload.risk_threshold
    config.require_trusted_device_for_high_sensitivity = (
        payload.require_trusted_device_for_high_sensitivity
    )
    config.require_mfa_for_high_sensitivity = payload.require_mfa_for_high_sensitivity
    db.commit()
    return {"message": "Policy updated successfully", **payload.model_dump()}


def _rule_response(rule: PolicyRule) -> dict:
    def split(value: str) -> list[str]:
        return [item for item in value.split(",") if item]

    return {
        "id": rule.id,
        "name": rule.name,
        "tenant": rule.tenant,
        "description": rule.description,
        "effect": rule.effect.value,
        "priority": rule.priority,
        "identities": split(rule.identities),
        "resources": split(rule.resources),
        "actions": split(rule.actions),
        "conditions": split(rule.conditions),
        "enabled": rule.enabled,
    }


@router.get("/policy/rules", dependencies=[Depends(enforce_admin_rate_limit)])
def list_policy_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    return [_rule_response(rule) for rule in db.query(PolicyRule).order_by(PolicyRule.priority)]


@router.post("/policy/rules", status_code=201, dependencies=[Depends(enforce_admin_rate_limit)])
def create_policy_rule(
    payload: PolicyRuleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    rule = PolicyRule(
        name=payload.name,
        tenant=payload.tenant,
        description=payload.description,
        effect=PolicyEffect(payload.effect),
        priority=payload.priority,
        identities=",".join(payload.identities),
        resources=",".join(payload.resources),
        actions=",".join(payload.actions),
        conditions=",".join(payload.conditions),
        enabled=payload.enabled,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _rule_response(rule)


@router.patch("/policy/rules/{rule_id}", dependencies=[Depends(enforce_admin_rate_limit)])
def update_policy_rule(
    rule_id: int,
    payload: PolicyRuleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    rule = db.get(PolicyRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Policy rule not found")
    for key, value in payload.model_dump().items():
        if key in {"identities", "resources", "actions", "conditions"}:
            value = ",".join(value)
        if key == "effect":
            value = PolicyEffect(value)
        setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return _rule_response(rule)


@router.delete("/policy/rules/{rule_id}", status_code=204, dependencies=[Depends(enforce_admin_rate_limit)])
def delete_policy_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    rule = db.get(PolicyRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Policy rule not found")
    db.delete(rule)
    db.commit()


@router.get("/audit/logs", response_model=list[dict])
def get_audit_logs(
    page: int = 1,
    page_size: int = 100,
    decision: str | None = None,
    search: str | None = None,
    actor: str | None = None,
    resource: str | None = None,
    action: str | None = None,
    severity: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {UserRole.ANALYST, UserRole.ADMINISTRATOR}:
        raise HTTPException(status_code=403, detail="Forbidden")
    page = max(page, 1)
    page_size = min(max(page_size, 1), 500)
    query = db.query(AuditLog)
    if decision in {"allow", "deny"}:
        query = query.filter(AuditLog.decision == decision)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditLog.user.ilike(pattern),
                AuditLog.resource.ilike(pattern),
                AuditLog.action.ilike(pattern),
                AuditLog.reason.ilike(pattern),
            )
        )
    if actor:
        query = query.filter(AuditLog.user == actor)
    if resource:
        query = query.filter(AuditLog.resource == resource)
    if action:
        query = query.filter(AuditLog.action == action)
    if severity == "critical":
        query = query.filter(AuditLog.risk_score >= 80)
    elif severity == "high":
        query = query.filter(AuditLog.risk_score >= 60, AuditLog.risk_score < 80)
    elif severity == "info":
        query = query.filter(AuditLog.risk_score < 60)
    if start_date:
        try:
            query = query.filter(AuditLog.timestamp >= datetime.fromisoformat(start_date))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="start_date must be ISO-8601") from exc
    if end_date:
        try:
            query = query.filter(AuditLog.timestamp <= datetime.fromisoformat(end_date))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="end_date must be ISO-8601") from exc
    logs = query.order_by(AuditLog.timestamp.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return [
        {
            "id": log.id,
            "user": log.user,
            "resource": log.resource,
            "action": log.action,
            "decision": log.decision,
            "result": log.decision,
            "reason": log.reason,
            "risk_score": log.risk_score,
            "severity": (
                "critical" if log.risk_score >= 80 else
                "high" if log.risk_score >= 60 else
                "info"
            ),
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]


@router.get("/dashboard/metrics")
def dashboard_metrics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = db.query(User).all()
    total = db.query(AuditLog).count()
    allowed = db.query(AuditLog).filter(AuditLog.decision == "allow").count()
    denied = db.query(AuditLog).filter(AuditLog.decision == "deny").count()
    role_distribution = {}
    for user in users:
        role = user.role.value if hasattr(user.role, "value") else user.role
        role_distribution[role] = role_distribution.get(role, 0) + 1
    recent = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all()

    return DashboardMetrics(
        total_access_requests=total,
        allowed_requests=allowed,
        denied_requests=denied,
        denial_percentage=(denied / total * 100) if total else 0,
        users_total=len(users),
        users_active=sum(1 for u in users if u.is_active),
        role_distribution=role_distribution,
        recent_events=[
            {
                "timestamp": event.timestamp.isoformat(),
                "event_type": "access_decision",
                "actor": event.user,
                "resource": event.resource,
                "action": event.action,
                "result": event.decision,
                "reason": event.reason,
            }
            for event in recent
        ],
    ).model_dump()


@router.get("/security-tests/run", dependencies=[Depends(enforce_admin_rate_limit)])
def security_tests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    results: list[dict] = []

    def add_result(
        name: str,
        expected: str,
        actual: str,
        passed: bool,
        reason: str,
        checks: list[str],
    ) -> None:
        results.append(
            {
                "name": name,
                "status": "pass" if passed else "fail",
                "passed": passed,
                "expected": expected,
                "actual": actual,
                "reason": reason,
                "checks": checks,
            }
        )

    add_result(
        "token_validity",
        "active authenticated administrator",
        "active authenticated administrator" if current_user.is_active else "inactive administrator",
        current_user.is_active,
        "The endpoint was reached through the JWT and active-user dependencies.",
        ["JWT signature and expiration were validated by the request dependencies."],
    )

    viewer = db.scalar(select(User).where(User.role == UserRole.VIEWER, User.is_active.is_(True)))
    viewer_denied = viewer is None or not (
        "resource:admin-manage" in ROLE_PERMISSIONS.get(viewer.role, set())
    )
    admin_allowed = "resource:admin-manage" in ROLE_PERMISSIONS.get(UserRole.ADMINISTRATOR, set())
    add_result(
        "rbac_enforcement",
        "viewer denied admin management and administrator allowed",
        f"viewer_denied={viewer_denied}, administrator_allowed={admin_allowed}",
        viewer_denied and admin_allowed,
        "Role permission mappings were evaluated directly.",
        ["resource:admin-manage is absent from viewer permissions.", "administrator permissions include resource:admin-manage."],
    )

    unknown_request = PolicyEvaluationRequest(
        username=current_user.username,
        resource="resources/unknown-security-test",
        action="read",
        simulated_device_trusted=True,
        simulated_mfa_passed=True,
        simulated_risk_score=0,
    )
    default_deny = evaluate_request(db, current_user, unknown_request, True)
    add_result(
        "default_deny",
        "unknown resources are denied",
        default_deny.decision,
        default_deny.decision == "deny",
        default_deny.reason,
        default_deny.failed_checks,
    )

    high_risk_request = PolicyEvaluationRequest(
        username=current_user.username,
        resource="resources/admin",
        action="manage",
        simulated_device_trusted=True,
        simulated_mfa_passed=True,
        simulated_risk_score=100,
    )
    high_risk_decision = evaluate_request(db, current_user, high_risk_request, True)
    policy_config = db.query(PolicyConfig).first()
    risk_threshold = policy_config.risk_threshold if policy_config else 70
    add_result(
        "risk_threshold",
        f"risk scores above {risk_threshold} are denied",
        high_risk_decision.decision,
        high_risk_decision.decision == "deny",
        high_risk_decision.reason,
        high_risk_decision.failed_checks,
    )

    rate_key = f"security-test-{current_user.id}-{datetime.now(timezone.utc).timestamp()}"
    rate_limiter.check(rate_key, "security-test", 1, 60)
    rate_limited = False
    try:
        rate_limiter.check(rate_key, "security-test", 1, 60)
    except HTTPException as exc:
        rate_limited = exc.status_code == 429 and "Retry-After" in (exc.headers or {})
    add_result(
        "rate_limiting",
        "second request returns HTTP 429 with Retry-After",
        "HTTP 429 with Retry-After" if rate_limited else "rate limit not enforced",
        rate_limited,
        "The in-process limiter was exercised with an isolated test key.",
        ["Configured authentication and administrator limits are process-local."],
    )

    try:
        PolicyEvaluationRequest(
            username=current_user.username,
            resource="resources/public",
            action="read",
            simulated_risk_score=101,
        )
    except ValidationError:
        validation_passed = True
    else:
        validation_passed = False
    add_result(
        "input_validation",
        "risk score outside 0-100 is rejected",
        "Pydantic rejected 101" if validation_passed else "invalid score accepted",
        validation_passed,
        "PolicyEvaluationRequest constrains simulated_risk_score to 0 through 100.",
        ["Request schema validation is active."],
    )

    log_before = db.query(AuditLog).count()
    log_decision(
        db,
        current_user.username,
        "security-tests",
        "run",
        "allow",
        "Authorized security tests executed",
        0,
    )
    log_after = db.query(AuditLog).count()
    add_result(
        "audit_event_generation",
        "security test execution creates an audit event",
        f"audit_count {log_before} -> {log_after}",
        log_after == log_before + 1,
        "The security-test execution was persisted to the audit log.",
        ["Audit records are database-backed and append-only through the service layer."],
    )

    return {"executed_at": datetime.now(timezone.utc), "results": results}


@router.get("/reports/csv", dependencies=[Depends(enforce_admin_rate_limit)])
def reports_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.services.reports import build_csv_report
    return StreamingResponse(
        BytesIO(build_csv_report(db=db)),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=zero-trust-audit.csv"},
    )


@router.get("/reports/pdf", dependencies=[Depends(enforce_admin_rate_limit)])
def reports_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.services.reports import build_pdf_report
    return Response(
        build_pdf_report(db=db),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=zero-trust-audit.pdf"},
    )


@router.get("/risk-analysis", dependencies=[Depends(enforce_admin_rate_limit)])
def risk_analysis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    scores = [log.risk_score for log in logs]
    overall = round(sum(scores) / len(scores)) if scores else 0
    return {
        "overall_risk_score": overall,
        "critical_count": sum(score >= 80 for score in scores),
        "high_count": sum(60 <= score < 80 for score in scores),
        "medium_count": sum(35 <= score < 60 for score in scores),
        "low_count": sum(score < 35 for score in scores),
        "sample_size": len(scores),
    }


@router.get("/rbac/matrix")
def rbac_matrix(current_user: User = Depends(get_current_user)):
    return {
        "role_permissions": {
            role.value: sorted(permissions) for role, permissions in ROLE_PERMISSIONS.items()
        },
        "resource_action_permissions": {
            f"{resource}:{action}": permission
            for (resource, action), permission in RESOURCE_ACTION_PERMISSION.items()
        },
        "resource_sensitivity": dict(RESOURCE_SENSITIVITY),
    }


@router.get("/resources")
def resources(current_user: User = Depends(get_current_user)):
    return {"resources": dict(RESOURCE_SENSITIVITY)}


@router.get("/documentation")
def documentation(
    slug: str = "overview",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    page = db.scalar(select(DocumentationPage).where(DocumentationPage.slug == slug))
    if page is None:
        raise HTTPException(status_code=404, detail="Documentation page not found")
    return {
        "slug": page.slug,
        "title": page.title,
        "content": page.content,
        "version": page.version,
        "updated_at": page.updated_at.isoformat(),
    }


@router.post("/assistant")
def assistant(
    payload: dict,
    current_user: User = Depends(get_current_user),
):
    message = payload.get("message")
    if not isinstance(message, str) or len(message) > 2000:
        raise HTTPException(status_code=422, detail="message must be a string up to 2000 characters")
    return {"answer": local_assistant_reply(message), "mode": "local"}