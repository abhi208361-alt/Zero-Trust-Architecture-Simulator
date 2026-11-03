"""Create the current application schema and upgrade legacy SQLite tables."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "users" in existing_tables:
        columns = {column["name"] for column in inspector.get_columns("users")}
        additions = {
            "display_name": sa.Column("display_name", sa.String(120), nullable=False, server_default=""),
            "theme": sa.Column("theme", sa.String(20), nullable=False, server_default="system"),
            "timezone": sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
            "notification_preferences": sa.Column(
                "notification_preferences", sa.String(), nullable=False, server_default="{}"
            ),
            "session_version": sa.Column("session_version", sa.Integer(), nullable=False, server_default="0"),
        }
        for name, column in additions.items():
            if name not in columns:
                op.add_column("users", column)

    if "audit_logs" in existing_tables:
        columns = {column["name"] for column in inspector.get_columns("audit_logs")}
        if "user" not in columns and {"actor_username", "created_at", "result"}.issubset(columns):
            op.rename_table("audit_logs", "audit_logs_legacy")
            op.create_table(
                "audit_logs",
                sa.Column("id", sa.Integer(), primary_key=True),
                sa.Column("user", sa.String(50), nullable=False),
                sa.Column("resource", sa.String(120), nullable=False),
                sa.Column("action", sa.String(80), nullable=False),
                sa.Column("decision", sa.String(20), nullable=False),
                sa.Column("reason", sa.Text(), nullable=False),
                sa.Column("risk_score", sa.Integer(), nullable=False, server_default="0"),
                sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
            )
            bind.execute(
                text(
                    """
                    INSERT INTO audit_logs
                        (id, user, resource, action, decision, reason, risk_score, timestamp)
                    SELECT id, COALESCE(actor_username, 'system'), resource, action, result,
                           reason, risk_score, created_at
                    FROM audit_logs_legacy
                    """
                )
            )
            op.drop_table("audit_logs_legacy")

    from app.db.base import Base
    from app.models import __init__  # noqa: F401

    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    for table in (
        "revoked_tokens",
        "policy_rules",
        "policy_config",
        "documentation_pages",
        "audit_logs",
        "users",
    ):
        if table in inspector.get_table_names():
            op.drop_table(table)
