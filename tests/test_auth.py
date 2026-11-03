from datetime import UTC, datetime, timedelta
import os

import jwt
import pytest

from app.core.config import Settings


def test_valid_login_and_me(client):
    response = client.post("/api/v1/auth/login", json={"username": "viewer", "password": "viewer123!"})
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert "refresh_token" not in response.json()

    me = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer " + token})
    assert me.status_code == 200
    assert me.json()["role"] == "viewer"


def test_registration_creates_viewer_account(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Registered User",
            "email": "registered@example.com",
            "username": "registered",
            "password": "registered123!",
            "role": "administrator",
        },
    )
    assert response.status_code == 200

    login = client.post(
        "/api/v1/auth/login",
        json={"username": "registered", "password": "registered123!"},
    )
    assert login.status_code == 200
    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer " + login.json()["access_token"]},
    )
    assert me.status_code == 200
    assert me.json()["role"] == "viewer"


def test_invalid_password_denied(client):
    response = client.post("/api/v1/auth/login", json={"username": "viewer", "password": "wrongpass1!"})
    assert response.status_code == 401


def test_missing_token_denied(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_malformed_token_denied(client):
    malformed = "Bearer " + ".".join(["invalid", "token", "value"])
    response = client.get("/api/v1/auth/me", headers={"Authorization": malformed})
    assert response.status_code == 401


def test_expired_token_denied(client):
    expired_payload = {
        "sub": "viewer",
        "jti": "expired-jti",
        "token_type": "access",
        "iat": datetime.now(UTC) - timedelta(hours=1),
        "exp": datetime.now(UTC) - timedelta(minutes=1),
    }
    token = jwt.encode(expired_payload, os.environ["JWT_SECRET_KEY"], algorithm="HS256")
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer " + token})
    assert response.status_code == 401
    assert response.json()["detail"] == "Token expired"


def test_invalid_signature_denied(client):
    payload = {
        "sub": "viewer",
        "jti": "invalid-signature",
        "token_type": "access",
        "iat": datetime.now(UTC),
        "exp": datetime.now(UTC) + timedelta(minutes=5),
    }
    token = jwt.encode(payload, "different-secret", algorithm="HS256")
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer " + token})
    assert response.status_code == 401


def test_disabled_account_denied(client):
    admin_headers = {"Authorization": "Bearer " + client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123!"}).json()["access_token"]}
    response = client.post("/api/v1/auth/login", json={"username": "viewer", "password": "viewer123!"})
    assert response.status_code == 200

    disabled = client.patch("/api/v1/users/1", headers=admin_headers, json={"is_active": False})
    assert disabled.status_code == 200

    response = client.post("/api/v1/auth/login", json={"username": "viewer", "password": "viewer123!"})
    assert response.status_code == 403


def test_password_change_invalidates_existing_session(client):
    first_login = client.post(
        "/api/v1/auth/login",
        json={"username": "viewer", "password": "viewer123!"},
    )
    second_login = client.post(
        "/api/v1/auth/login",
        json={"username": "viewer", "password": "viewer123!"},
    )
    first_headers = {"Authorization": "Bearer " + first_login.json()["access_token"]}
    second_headers = {"Authorization": "Bearer " + second_login.json()["access_token"]}
    changed = client.patch(
        "/api/v1/auth/me",
        headers=first_headers,
        json={"password": "viewer456!"},
    )
    assert changed.status_code == 200
    assert client.get("/api/v1/auth/me", headers=first_headers).status_code == 401
    assert client.get("/api/v1/auth/me", headers=second_headers).status_code == 401
    new_login = client.post(
        "/api/v1/auth/login",
        json={"username": "viewer", "password": "viewer456!"},
    )
    assert new_login.status_code == 200


@pytest.mark.parametrize(
    "secret",
    [
        "generate-a-random-secret-at-least-32-characters",
        "replace-with-a-random-secret-value-123456",
        "a" * 32,
    ],
)
def test_insecure_jwt_secrets_are_rejected(secret):
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        Settings(_env_file=None, JWT_SECRET_KEY=secret)


def test_missing_jwt_secret_is_rejected(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        Settings(_env_file=None)


def test_demo_accounts_are_disabled_by_default():
    settings = Settings(
        _env_file=None,
        JWT_SECRET_KEY="secure-test-secret-with-enough-entropy-123456",
    )
    assert settings.ENABLE_DEMO_DATA is False
    assert settings.ADMIN_PASSWORD is None


def test_login_rate_limit_returns_retry_after(client):
    for _ in range(5):
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "viewer", "password": "wrongpass1!"},
        )
        assert response.status_code == 401

    limited = client.post(
        "/api/v1/auth/login",
        json={"username": "viewer", "password": "wrongpass1!"},
    )
    assert limited.status_code == 429
    assert int(limited.headers["Retry-After"]) >= 1


def test_registration_rate_limit_returns_retry_after(client):
    for index in range(5):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": f"Rate Limited {index}",
                "email": f"rate-limited-{index}@example.com",
                "username": f"ratelimited{index}",
                "password": "registered123!",
            },
        )
        assert response.status_code == 200

    limited = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Rate Limited Final",
            "email": "rate-limited-final@example.com",
            "username": "ratelimitedfinal",
            "password": "registered123!",
        },
    )
    assert limited.status_code == 429
    assert int(limited.headers["Retry-After"]) >= 1


def test_admin_endpoint_rate_limit_returns_retry_after(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123!"},
    )
    headers = {"Authorization": "Bearer " + login.json()["access_token"]}
    for _ in range(30):
        response = client.get("/api/v1/security-tests/run", headers=headers)
        assert response.status_code == 200

    limited = client.get("/api/v1/security-tests/run", headers=headers)
    assert limited.status_code == 429
    assert int(limited.headers["Retry-After"]) >= 1