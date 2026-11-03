from datetime import UTC, datetime, timedelta
import os

import jwt


def test_valid_login_and_me(client):
    response = client.post("/api/v1/auth/login", json={"username": "viewer", "password": "viewer123!"})
    assert response.status_code == 200
    token = response.json()["access_token"]

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
    login = client.post(
        "/api/v1/auth/login",
        json={"username": "viewer", "password": "viewer123!"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": "Bearer " + token}
    changed = client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={"password": "viewer456!"},
    )
    assert changed.status_code == 200
    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 401
    new_login = client.post(
        "/api/v1/auth/login",
        json={"username": "viewer", "password": "viewer456!"},
    )
    assert new_login.status_code == 200