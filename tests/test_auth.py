from datetime import UTC, datetime, timedelta

import jwt


def test_valid_login_and_me(client):
    response = client.post("/api/v1/auth/login", json={"username": "viewer", "password": "viewer123!"})
    assert response.status_code == 200
    token = response.json()["access_token"]

    me = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer " + token})
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
    token = jwt.encode(expired_payload, "test-secret-key-1234567890", algorithm="HS256")
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


def test_disabled_account_denied(client, auth_headers):
    admin_headers = auth_headers("admin", "admin123!")
    users = client.get("/api/v1/users", headers=admin_headers).json()
    viewer_id = next(u["id"] for u in users if u["username"] == "viewer")
    disable = client.patch(f"/api/v1/users/{viewer_id}", json={"is_active": False}, headers=admin_headers)
    assert disable.status_code == 200

    response = client.post("/api/v1/auth/login", json={"username": "viewer", "password": "viewer123!"})
    assert response.status_code == 403


def test_logout_revokes_token(client):
    login = client.post("/api/v1/auth/login", json={"username": "viewer", "password": "viewer123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": "Bearer " + token}

    logout = client.post("/api/v1/auth/logout", headers=headers)
    assert logout.status_code == 200

    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 401
