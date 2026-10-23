from datetime import datetime
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    created_at: datetime
    correlation_id: str
    event_type: str
    actor_id: int | None
    actor_username: str | None
    resource: str
    action: str
    result: str
    reason: str
    risk_score: int
    metadata_json: str


class AuditSummaryResponse(BaseModel):
    total_events: int
    allowed_events: int
    denied_events: int
    auth_failures: int