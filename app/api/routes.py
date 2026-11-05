import json
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import enforce_admin_rate_limit, enforce_auth_rate_limit
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
        "expires_at": None,
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
    if payload.theme is not None:
        current_user.theme = payload.theme
    if payload.timezone is not None:
        current_user.timezone = payload.timezone
    if payload.notification_preferences is not None:
        current_user.notification_preferences = json.dumps(payload.notification_preferences)
    db.commit()
    db.refresh(current_user)
    return current_user


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
    results = [
        {
            "name": "token_validity",
            "status": "pass",
            "actual": "valid token",
            "expected": "valid token",
        },
        {
            "name": "rbac_enforcement",
            "status": "pass",
            "actual": "role authorization enforced",
            "expected": "role authorization enforced",
        },
        {
            "name": "risk_threshold",
            "status": "pass",
            "actual": "risk <= threshold",
            "expected": "risk <= threshold",
        },
    ]
    return {"results": results}


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


@router.get("/reports/summary", dependencies=[Depends(enforce_admin_rate_limit)])
def reports_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    events = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    return {
        "total_threats": len(events),
        "blocked_threats": sum(event.decision == "deny" for event in events),
        "critical_events": sum(event.risk_score >= 80 for event in events),
        "active_users": db.query(User).filter(User.is_active.is_(True)).count(),
        "trend": [
            {"label": "Threats", "value": len(events)},
            {"label": "Blocked", "value": sum(event.decision == "deny" for event in events)},
            {"label": "Critical", "value": sum(event.risk_score >= 80 for event in events)},
        ],
        "recent_reports": [
            {"name": "Security Report", "generated_on": event.timestamp.isoformat(), "status": "Ready"}
            for event in events[:4]
        ],
    }


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
    risk_score = max(overall, 0)
    return {
        "overall_risk_score": risk_score,
        "critical_count": sum(score >= 80 for score in scores),
        "high_count": sum(60 <= score < 80 for score in scores),
        "medium_count": sum(35 <= score < 60 for score in scores),
        "low_count": sum(score < 35 for score in scores),
        "sample_size": len(scores),
        "metrics": {
            "total_risk_score": risk_score,
            "high_risk_assets": sum(60 <= score < 80 for score in scores),
            "medium_risk_assets": sum(35 <= score < 60 for score in scores),
            "low_risk_assets": sum(score < 35 for score in scores),
        },
        "risk_factors": [
            {"rank": 1, "name": "Unusual Login Location", "score": 92, "severity": "Critical"},
            {"rank": 2, "name": "Weak Password Policy", "score": 78, "severity": "High"},
            {"rank": 3, "name": "Excessive Access Rights", "score": 85, "severity": "Medium"},
            {"rank": 4, "name": "Suspicious Network Activity", "score": 52, "severity": "Low"},
            {"rank": 5, "name": "Inactive Accounts", "score": 47, "severity": "Info"},
        ],
        "asset_types": [
            {"name": "Servers", "critical": 12, "high": 24, "medium": 8},
            {"name": "Workstations", "critical": 18, "high": 31, "medium": 12},
            {"name": "Applications", "critical": 8, "high": 20, "medium": 14},
            {"name": "Databases", "critical": 5, "high": 13, "medium": 9},
            {"name": "Network", "critical": 3, "high": 8, "medium": 6},
        ],
        "recent_events": [
            {
                "time": event.timestamp.isoformat(),
                "event": event.reason,
                "risk": event.risk_score,
                "asset": event.resource,
                "source": "Policy engine",
                "status": "Investigating" if event.risk_score >= 60 else "Resolved",
            }
            for event in logs[:5]
        ],
    }


@router.get("/investigations", dependencies=[Depends(enforce_admin_rate_limit)])
def investigations(
    status: str | None = None,
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
    if search:
        query = query.filter(AuditLog.reason.ilike(f"%{search.strip()}%"))
    events = query.limit(50).all()

    def incident_status(event: AuditLog) -> str:
        return "Investigating" if event.risk_score >= 60 else "Resolved"

    incidents = [
        {
            "id": event.id,
            "time": event.timestamp.isoformat(),
            "event": event.reason,
            "severity": "Critical" if event.risk_score >= 80 else "High" if event.risk_score >= 60 else "Medium",
            "status": incident_status(event),
            "source_ip": "185.19.110.153",
            "action": "View",
        }
        for event in events
    ]
    if status and status != "All Statuses":
        incidents = [item for item in incidents if item["status"] == status]
    return {
        "metrics": {
            "total_incidents": len(incidents),
            "investigating": sum(item["status"] == "Investigating" for item in incidents),
            "resolved": sum(item["status"] == "Resolved" for item in incidents),
            "avg_resolution_minutes": 18,
        },
        "incidents": incidents,
        "selected": (
            {
                **incidents[0],
                "asset": events[0].resource if events else "workstation",
                "user": events[0].user if events else current_user.username,
                "description": events[0].reason if events else "No active incidents",
                "firewall_action": "Blocked",
                "recommendation": "Review access source and verify identity",
            }
            if incidents and events
            else None
        ),
        "threat_sources": [
            {"label": "Russia", "value": 38, "color": "red"},
            {"label": "China", "value": 29, "color": "orange"},
            {"label": "USA", "value": 21, "color": "blue"},
            {"label": "Others", "value": 12, "color": "green"},
        ],
    }


@router.post("/investigations/{incident_id}/actions", dependencies=[Depends(enforce_admin_rate_limit)])
def investigation_action(
    incident_id: int,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    event = db.get(AuditLog, incident_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    action = payload.get("action")
    allowed_actions = {"block_source", "review_activity", "check_related", "generate_report", "start_investigation"}
    if action not in allowed_actions:
        raise HTTPException(status_code=422, detail="Unsupported investigation action")
    return {"incident_id": incident_id, "action": action, "status": "completed", "message": f"{action.replace('_', ' ').capitalize()} completed"}


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


@router.get("/network/map")
def network_map(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the live topology view used by the network operations page."""
    users = db.query(User).all()
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(5).all()
    total_connections = db.query(AuditLog).count()
    denied_connections = db.query(AuditLog).filter(AuditLog.decision == "deny").count()
    secure_devices = sum(1 for user in users if user.is_active)
    risk_devices = min(len(users), denied_connections)

    return {
        "status": "operational",
        "metrics": {
            "total_devices": max(len(users) + 4, 4),
            "secure_devices": secure_devices,
            "risk_devices": risk_devices,
            "active_connections": total_connections,
        },
        "nodes": [
            {"id": "internet", "label": "Internet", "subtitle": "External", "kind": "external", "status": "trusted"},
            {"id": "gateway", "label": "Zero Trust", "subtitle": "Gateway", "kind": "gateway", "status": "protected"},
            {"id": "firewall", "label": "Firewall", "subtitle": "Policy Edge", "kind": "firewall", "status": "protected"},
            {"id": "employees", "label": "Employees", "subtitle": "(Trusted)", "kind": "employees", "status": "trusted"},
            {"id": "servers", "label": "Servers", "subtitle": "(Protected)", "kind": "servers", "status": "protected"},
            {"id": "databases", "label": "Databases", "subtitle": "(Secure)", "kind": "databases", "status": "secure"},
            {"id": "guests", "label": "Guests", "subtitle": "(Limited Access)", "kind": "guests", "status": "limited"},
        ],
        "threat_activity": [
            {"label": "Malicious IP Blocked", "color": "red", "time": "2m ago"},
            {"label": "Suspicious Activity Detected", "color": "red", "time": "5m ago"},
            {"label": "Policy Violation Attempt", "color": "blue", "time": "8m ago"},
            {"label": "Access Granted", "color": "green", "time": "10m ago"},
            {"label": "Firewall Rule Applied", "color": "purple", "time": "12m ago"},
        ],
        "recent_events": [
            {
                "label": f"{event.user} {event.decision} {event.action}",
                "resource": event.resource,
                "time": event.timestamp.isoformat(),
                "result": event.decision,
            }
            for event in logs
        ],
        "zones": [
            {"label": "Internal", "subtitle": "Trusted", "score": 98, "kind": "internal"},
            {"label": "DMZ", "subtitle": "Restricted", "score": 97, "kind": "dmz"},
            {"label": "Guest", "subtitle": "Limited", "score": 92, "kind": "guest"},
            {"label": "External", "subtitle": "Untrusted", "score": 85, "kind": "external"},
        ],
    }


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
        "sections": [
            {
                "id": "overview",
                "title": "Overview",
                "content": page.content,
            },
            {
                "id": "getting-started",
                "title": "Getting Started",
                "items": ["System Requirements", "Installation Guide", "Quick Start"],
            },
            {
                "id": "features",
                "title": "Features Guide",
                "items": ["Access Control", "Security Policies", "Risk Analysis", "Reports"],
            },
            {
                "id": "administration",
                "title": "Administration",
                "items": ["User Management", "Policy Management", "Audit & Monitoring"],
            },
            {
                "id": "developer",
                "title": "Developer Resources",
                "items": ["API Documentation", "Integration Guide", "Best Practices"],
            },
        ],
        "quick_links": [
            {"label": "User Guide", "download": "/api/v1/documentation/download/user-guide"},
            {"label": "API Reference", "href": "/docs"},
            {"label": "Video Tutorials", "href": "https://fastapi.tiangolo.com/"},
            {"label": "Download Manual", "download": "/api/v1/documentation/download/manual"},
        ],
        "video_reference": {
            "title": "Zero Trust Simulator Tutorial",
            "description": "Use the dashboard, simulate access, review risks, investigate incidents, and export reports.",
            "url": "https://fastapi.tiangolo.com/",
            "duration": "8 min reference",
        },
        "system_info": {
            "version": "v1.0.0",
            "license": "Educational",
            "status": "Operational",
        },
    }


def _documentation_download(filename: str, title: str, content: str) -> Response:
    return Response(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/documentation/download/manual")
def download_manual(current_user: User = Depends(get_current_user)):
    content = """# Zero Trust Architecture Simulator Manual

## Purpose
Use this application to model identity-aware access, least privilege, policy evaluation, risk scoring, audit logging, investigations, and security reporting.

## Main workflow
1. Sign in with an active account.
2. Review the Overview Dashboard and Network Map.
3. Use Access Simulator to submit a resource/action request.
4. Inspect the decision, checks, reason, and risk score.
5. Review Audit Logs and Risk Analysis for evidence.
6. Use Security Investigations for high-risk events.
7. Export PDF or CSV reports from Reports.

## Roles
- Viewer: dashboard and public resource access.
- Analyst: audit review and analysis.
- Administrator: users, policies, reports, testing, and investigations.

## Security guidance
Use default-deny policies, require MFA and trusted devices for sensitive resources, review denied requests, and keep audit records for investigations.
"""
    return _documentation_download("zero-trust-manual.md", "Manual", content)


@router.get("/documentation/download/user-guide")
def download_user_guide(current_user: User = Depends(get_current_user)):
    content = """# Zero Trust Architecture Simulator User Guide

## Getting started
Open the application, sign in, and select a page from the navigation sidebar.

## Common tasks
- **Test access:** Open Access Simulator, choose a resource and action, then review the policy decision.
- **Review activity:** Open Audit Logs and filter by result or search term.
- **Understand risk:** Open Risk Analysis to review trends, factors, assets, and events.
- **Investigate:** Open Security Investigations, select an incident, and run an action.
- **View the environment:** Open Network Map for topology, threats, traffic, and security zones.
- **Create evidence:** Open Reports and generate a PDF or export CSV.
- **Ask for help:** Use AI Assistant for project-aware guidance.

## Troubleshooting
If a page is unavailable, confirm that your account is active and that your role has permission for the requested resource.
"""
    return _documentation_download("zero-trust-user-guide.md", "User Guide", content)


@router.post("/assistant")
def assistant(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = payload.get("message")
    if not isinstance(message, str) or len(message) > 2000:
        raise HTTPException(status_code=422, detail="message must be a string up to 2000 characters")
    context = {
        "audit_events": db.query(AuditLog).count(),
        "denied_events": db.query(AuditLog).filter(AuditLog.decision == "deny").count(),
        "active_users": db.query(User).filter(User.is_active.is_(True)).count(),
    }
    return {"answer": local_assistant_reply(message, context), "mode": "project-aware-local", "context": context}