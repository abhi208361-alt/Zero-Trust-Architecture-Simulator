import json
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def write_audit_log(
    db: Session,
    *,
    correlation_id: str,
    event_type: str,
    actor_id: int | None,
    actor_username: str | None,
    resource: str,
    action: str,
    result: str,
    reason: str,
    risk_score: int = 0,
    metadata: dict | None = None,
) -> AuditLog:
    audit = AuditLog(
        created_at=datetime.now(UTC),
        correlation_id=correlation_id,
        event_type=event_type,
        actor_id=actor_id,
        actor_username=actor_username,
        resource=resource,
        action=action,
        result=result,
        reason=reason,
        risk_score=risk_score,
        metadata_json=json.dumps(metadata or {}, ensure_ascii=False),
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


def get_audit_summary(db: Session) -> dict[str, int]:
    total = db.scalar(select(func.count(AuditLog.id))) or 0
    allowed = db.scalar(select(func.count(AuditLog.id)).where(AuditLog.result == "allow")) or 0
    denied = db.scalar(select(func.count(AuditLog.id)).where(AuditLog.result == "deny")) or 0
    auth_failures = (
        db.scalar(
            select(func.count(AuditLog.id)).where(
                AuditLog.event_type == "authentication", AuditLog.result == "deny"
            )
        )
        or 0
    )
    return {
        "total_events": int(total),
        "allowed_events": int(allowed),
        "denied_events": int(denied),
        "auth_failures": int(auth_failures),
    }
