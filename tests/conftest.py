import importlib
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_file = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret-key-1234567890")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")

    import app.core.config
    import app.db.session
    import app.api.deps
    import app.api.routes
    import app.main

    app.core.config.get_settings.cache_clear()
    importlib.reload(app.core.config)
    importlib.reload(app.db.session)
    importlib.reload(app.api.deps)
    importlib.reload(app.api.routes)
    importlib.reload(app.main)

    test_app = app.main.create_app()
    with TestClient(test_app) as test_client:
        yield test_client


@pytest.fixture()
def auth_headers(client):
    def _login(username: str, password: str):
        response = client.post("/api/v1/auth/login", json={"username": username, "password": password})
        assert response.status_code == 200, response.text
        token = response.json()["access_token"]
        return {"Authorization": "Bearer " + token}

    return _login
