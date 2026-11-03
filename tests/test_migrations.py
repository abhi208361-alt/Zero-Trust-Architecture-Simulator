import sqlite3
from pathlib import Path

from alembic import command
from alembic.config import Config


def _alembic_config(database_path: Path) -> Config:
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_path}")
    return config


def test_initial_migration_creates_and_rolls_back_schema(tmp_path):
    database_path = tmp_path / "migration.db"
    config = _alembic_config(database_path)

    command.upgrade(config, "head")
    connection = sqlite3.connect(database_path)
    tables = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
    }
    assert {"users", "audit_logs", "revoked_tokens", "policy_config", "policy_rules"} <= tables
    assert "session_version" in {
        row[1] for row in connection.execute("PRAGMA table_info(users)")
    }
    connection.close()

    command.downgrade(config, "base")
    connection = sqlite3.connect(database_path)
    remaining = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
    }
    assert not remaining.intersection(
        {"users", "audit_logs", "revoked_tokens", "policy_config", "policy_rules"}
    )
    connection.close()


def test_initial_migration_preserves_legacy_records(tmp_path):
    database_path = tmp_path / "legacy.db"
    connection = sqlite3.connect(database_path)
    connection.executescript(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username VARCHAR(50) NOT NULL,
            email VARCHAR(255) NOT NULL,
            full_name VARCHAR(120) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(13) NOT NULL,
            is_active BOOLEAN NOT NULL
        );
        INSERT INTO users VALUES (1, 'legacy', 'legacy@example.com', 'Legacy User', 'hash', 'VIEWER', 1);
        CREATE TABLE audit_logs (
            id INTEGER PRIMARY KEY,
            created_at DATETIME NOT NULL,
            correlation_id VARCHAR(64) NOT NULL,
            event_type VARCHAR(80) NOT NULL,
            actor_id INTEGER,
            actor_username VARCHAR(50),
            resource VARCHAR(120) NOT NULL,
            action VARCHAR(80) NOT NULL,
            result VARCHAR(16) NOT NULL,
            reason VARCHAR(255) NOT NULL,
            risk_score INTEGER NOT NULL,
            metadata_json TEXT NOT NULL
        );
        INSERT INTO audit_logs VALUES
            (1, '2026-01-01T00:00:00', 'corr-1', 'access_decision', 1, 'legacy',
             'resources/public', 'read', 'allow', 'legacy decision', 10, '{}');
        """
    )
    connection.commit()
    connection.close()

    command.upgrade(_alembic_config(database_path), "head")

    connection = sqlite3.connect(database_path)
    assert connection.execute("SELECT username FROM users").fetchone() == ("legacy",)
    assert connection.execute("SELECT user, decision FROM audit_logs").fetchone() == (
        "legacy",
        "allow",
    )
    connection.close()
