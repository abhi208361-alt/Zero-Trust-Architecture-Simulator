from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def log_decision(db: Session, user: str, resource: str, action: str, decision: str, reason: str, risk_score: int):
    audit_entry = AuditLog(
        user=user,
        resource=resource,
        action=action,
        decision=decision,
        reason=reason,
        risk_score=risk_score,
        timestamp=datetime.now(UTC),
    )
    db.add(audit_entry)
    db.commit()