from collections.abc import Mapping

from app.models.user import UserRole

ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.VIEWER: {
        "dashboard:read",
        "resource:public-read",
        "resource:summary-read",
    },
    UserRole.ANALYST: {
        "dashboard:read",
        "resource:public-read",
        "resource:summary-read",
        "resource:security-events-read",
        "analysis:create",
        "audit:read",
    },
    UserRole.ADMINISTRATOR: {
        "dashboard:read",
        "resource:public-read",
        "resource:summary-read",
        "resource:security-events-read",
        "analysis:create",
        "users:manage",
        "policy:manage",
        "audit:read",
        "resource:admin-manage",
    },
}

RESOURCE_ACTION_PERMISSION: Mapping[tuple[str, str], str] = {
    ("dashboard", "read"): "dashboard:read",
    ("resources/public", "read"): "resource:public-read",
    ("resources/summary", "read"): "resource:summary-read",
    ("resources/security-events", "read"): "resource:security-events-read",
    ("resources/admin", "manage"): "resource:admin-manage",
    ("analysis", "create"): "analysis:create",
    ("users", "manage"): "users:manage",
    ("policy", "manage"): "policy:manage",
    ("audit", "read"): "audit:read",
}

RESOURCE_SENSITIVITY: Mapping[str, str] = {
    "dashboard": "low",
    "resources/public": "low",
    "resources/summary": "medium",
    "resources/security-events": "high",
    "resources/admin": "high",
    "analysis": "medium",
    "users": "high",
    "policy": "high",
    "audit": "high",
}


def has_permission(role: UserRole, resource: str, action: str) -> tuple[bool, str]:
    key = (resource, action)
    permission = RESOURCE_ACTION_PERMISSION.get(key)
    if not permission:
        return False, "undefined permission mapping"
    role_permissions = ROLE_PERMISSIONS.get(role)
    if role_permissions is None:
        return False, "unknown role"
    if permission not in role_permissions:
        return False, "permission denied"
    return True, "permission granted"
