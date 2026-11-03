from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.db.base import Base
from app.db.init_db import init_defaults
from app.db.session import SessionLocal
from app.db.session import engine
from app.models import __init__  # noqa: F401
from app.core.rate_limit import rate_limiter
from sqlalchemy import inspect, text


def create_app() -> FastAPI:
    settings = get_settings()
    rate_limiter.clear()
    Base.metadata.create_all(bind=engine)
    _upgrade_existing_schema()
    with SessionLocal() as db:
        init_defaults(db)

    application = FastAPI(title="Zero Trust Architecture Simulator")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    application.include_router(router)
    return application


def _upgrade_existing_schema() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        _upgrade_audit_schema(inspector)
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    with engine.begin() as connection:
        additions = {
            "display_name": "VARCHAR(120) NOT NULL DEFAULT ''",
            "theme": "VARCHAR(20) NOT NULL DEFAULT 'system'",
            "timezone": "VARCHAR(64) NOT NULL DEFAULT 'UTC'",
            "notification_preferences": "VARCHAR NOT NULL DEFAULT '{}'",
            "session_version": "INTEGER NOT NULL DEFAULT 0",
        }
        for column, definition in additions.items():
            if column not in columns:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {column} {definition}"))
    _upgrade_audit_schema(inspect(engine))


def _upgrade_audit_schema(inspector) -> None:
    if "audit_logs" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("audit_logs")}
    if "user" in columns:
        return
    if not {"actor_username", "created_at", "result"}.issubset(columns):
        raise RuntimeError("Unsupported audit_logs schema; migrate it before starting the application")

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE audit_logs RENAME TO audit_logs_legacy"))
        connection.execute(
            text(
                """
                CREATE TABLE audit_logs (
                    id INTEGER NOT NULL PRIMARY KEY,
                    user VARCHAR(50) NOT NULL,
                    resource VARCHAR(120) NOT NULL,
                    action VARCHAR(80) NOT NULL,
                    decision VARCHAR(20) NOT NULL,
                    reason TEXT NOT NULL,
                    risk_score INTEGER NOT NULL DEFAULT 0,
                    timestamp DATETIME NOT NULL
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO audit_logs
                    (id, user, resource, action, decision, reason, risk_score, timestamp)
                SELECT
                    id,
                    COALESCE(actor_username, 'system'),
                    resource,
                    action,
                    result,
                    reason,
                    risk_score,
                    created_at
                FROM audit_logs_legacy
                """
            )
        )
        connection.execute(text("DROP TABLE audit_logs_legacy"))


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)