from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.documentation import DocumentationPage
from app.models.policy import PolicyConfig
from app.models.policy_rule import PolicyRule
from app.models.user import User, UserRole
from app.services.security import get_password_hash


def get_default_password(username: str) -> str:
    passwords = {
        "viewer": getattr(get_settings(), "viewer_password", "viewer123!"),
        "analyst": getattr(get_settings(), "analyst_password", "analyst123!"),
        "admin": getattr(get_settings(), "admin_password", "admin123!"),
    }
    return passwords.get(username, "change-me-in-env")


DEFAULT_USERS = [
    {
        "username": "viewer",
        "email": "viewer@example.com",
        "full_name": "Viewer User",
        "role": UserRole.VIEWER,
        "password": get_default_password("viewer"),
    },
    {
        "username": "analyst",
        "email": "analyst@example.com",
        "full_name": "Analyst User",
        "role": UserRole.ANALYST,
        "password": get_default_password("analyst"),
    },
    {
        "username": "admin",
        "email": "admin@example.com",
        "full_name": "Administrator User",
        "role": UserRole.ADMINISTRATOR,
        "password": get_default_password("admin"),
    },
]

DEFAULT_DOCUMENTATION = {
    "slug": "overview",
    "title": "Zero Trust Architecture Simulator",
    "content": (
        "# Zero Trust Architecture Simulator\n\n"
        "This application demonstrates identity validation, least-privilege access, "
        "policy evaluation, and audit logging in a zero-trust architecture."
    ),
}

DEFAULT_POLICY_RULES = [
    {
        "name": "default deny all",
        "tenant": "default",
        "description": "Default deny rule for unapproved access.",
        "effect": "deny",
        "priority": 1000,
        "identities": [],
        "resources": [],
        "actions": [],
        "conditions": [],
        "enabled": True,
    },
    {
        "name": "viewer public read",
        "tenant": "default",
        "description": "Allow viewer to read public resources.",
        "effect": "allow",
        "priority": 100,
        "identities": ["viewer"],
        "resources": ["resources/public"],
        "actions": ["read"],
        "conditions": [],
        "enabled": True,
    },
    {
        "name": "admin full access",
        "tenant": "default",
        "description": "Admin full access to protected resources.",
        "effect": "allow",
        "priority": 10,
        "identities": ["admin"],
        "resources": ["resources/admin"],
        "actions": ["manage"],
        "conditions": [],
        "enabled": True,
    },
]


def init_defaults(db: Session) -> None:
    if db.scalar(select(PolicyConfig).limit(1)) is None:
        db.add(PolicyConfig(id=1))

    doc = db.scalar(select(DocumentationPage).where(DocumentationPage.slug == DEFAULT_DOCUMENTATION["slug"]))
    if doc is None:
        db.add(
            DocumentationPage(
                slug=DEFAULT_DOCUMENTATION["slug"],
                title=DEFAULT_DOCUMENTATION["title"],
                content=DEFAULT_DOCUMENTATION["content"],
                version=1,
                updated_by="system",
            )
        )

    for user_data in DEFAULT_USERS:
        if db.scalar(select(User).where(User.username == user_data["username"])):
            continue

        db.add(
            User(
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                display_name=user_data["full_name"],
                role=user_data["role"],
                password_hash=get_password_hash(user_data["password"]),
                is_active=True,
                theme="dark",
                timezone="UTC",
            )
        )

    for rule_data in DEFAULT_POLICY_RULES:
        if db.scalar(select(PolicyRule).where(PolicyRule.name == rule_data["name"])):
            continue

        db.add(
            PolicyRule(
                name=rule_data["name"],
                tenant=rule_data["tenant"],
                description=rule_data["description"],
                effect=rule_data["effect"],
                priority=rule_data["priority"],
                identities=",".join(rule_data["identities"]),
                resources=",".join(rule_data["resources"]),
                actions=",".join(rule_data["actions"]),
                conditions=",".join(rule_data["conditions"]),
                enabled=rule_data["enabled"],
            )
        )

    db.commit()