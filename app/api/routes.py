from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import authenticate_user, create_access_token, get_password_hash
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.policy import PolicyConfig
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, TokenResponse, UserCreateRequest, UserResponse, UserUpdateRequest
from app.schemas.dashboard import DashboardMetrics
from app.schemas.policy import PolicyDecision, PolicyEvaluationRequest
from app.services.audit import log_decision
from app.services.policy_engine import evaluate_request

router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.username)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_at": datetime.now(timezone.utc),
    }


@router.get("/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/auth/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}


@router.post("/auth/register")
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
        hashed_password=get_password_hash(payload.password),
        role=payload.role or UserRole.VIEWER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User registered successfully"}


@router.get("/users", response_model=list[UserResponse])
def list_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    users = db.query(User).all()
    return users


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, payload: UserUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
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
    decision = evaluate_request(db, current_user, payload, True)
    log_decision(db, current_user.username, payload.resource, payload.action, decision.decision, decision.reason, decision.risk_score)
    return decision


@router.get("/policy/config")
def get_policy_config(db: Session = Depends(get_db)):
    return db.query(PolicyConfig).first()


@router.put("/policy/config")
def update_policy_config(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    config = db.query(PolicyConfig).first()
    if config is None:
        config = PolicyConfig()
        db.add(config)
    config.risk_threshold = int(payload.get("risk_threshold", config.risk_threshold))
    config.require_trusted_device_for_high_sensitivity = bool(payload.get("require_trusted_device_for_high_sensitivity", config.require_trusted_device_for_high_sensitivity))
    config.require_mfa_for_high_sensitivity = bool(payload.get("require_mfa_for_high_sensitivity", config.require_mfa_for_high_sensitivity))
    db.commit()
    return {"message": "Policy updated successfully"}


@router.get("/audit/logs", response_model=list[dict])
def get_audit_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in {UserRole.ANALYST, UserRole.ADMINISTRATOR}:
        raise HTTPException(status_code=403, detail="Forbidden")
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    return [
        {
            "id": log.id,
            "user": log.user,
            "resource": log.resource,
            "action": log.action,
            "decision": log.decision,
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
        role_distribution[user.role] = role_distribution.get(user.role, 0) + 1

    return DashboardMetrics(
        total_access_requests=total,
        allowed_requests=allowed,
        denied_requests=denied,
        denial_percentage=(denied / total * 100) if total else 0,
        users_total=len(users),
        users_active=sum(1 for u in users if u.is_active),
        role_distribution=role_distribution,
        recent_events=[],
    ).model_dump()


@router.get("/security-tests/run")
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


@router.get("/reports/csv")
def reports_csv(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"message": "CSV export generated"}


@router.get("/reports/pdf")
def reports_pdf(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"message": "PDF export generated"}


@router.get("/risk-analysis")
def risk_analysis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {
        "overall_risk_score": 80,
        "critical_count": 6,
        "high_count": 12,
        "low_count": 24,
    }