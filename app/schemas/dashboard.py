from pydantic import BaseModel


class DashboardMetrics(BaseModel):
    total_access_requests: int
    allowed_requests: int
    denied_requests: int
    denial_percentage: float
    users_total: int
    users_active: int
    role_distribution: dict[str, int]
    recent_events: list[dict]