def test_database_initialization_and_seeded_users(client, auth_headers):
    headers = auth_headers("admin", "admin123!")
    users = client.get("/api/v1/users", headers=headers)
    assert users.status_code == 200
    usernames = {u["username"] for u in users.json()}
    assert {"viewer", "analyst", "admin"}.issubset(usernames)

def test_audit_logging_and_authorization(client, auth_headers):
    viewer_headers = auth_headers("viewer", "viewer123!")
    analyst_headers = auth_headers("analyst", "analyst123!")

    client.post(
        "/api/v1/resources/access",
        headers=viewer_headers,
        json={
            "username": "viewer",
            "resource": "resources/admin",
            "action": "manage",
            "simulated_device_trusted": True,
            "simulated_risk_score": 10,
        },
    )

    denied = client.get("/api/v1/audit/logs", headers=viewer_headers)
    assert denied.status_code == 403

    allowed = client.get("/api/v1/audit/logs", headers=analyst_headers)
    assert allowed.status_code == 200
    logs = allowed.json()
    assert any(log["result"] == "deny" for log in logs)
    assert all("password" not in log["reason"].lower() for log in logs)

def test_dashboard_and_security_testing_endpoints(client, auth_headers):
    headers = auth_headers("admin", "admin123!")
    metrics = client.get("/api/v1/dashboard/metrics", headers=headers)
    assert metrics.status_code == 200
    assert "total_access_requests" in metrics.json()

    security_test = client.get("/api/v1/security-tests/run", headers=headers)
    assert security_test.status_code == 200
    data = security_test.json()
    assert data["results"]
    assert all("actual" in item and "expected" in item for item in data["results"])


def test_admin_management_and_local_assistant_endpoints(client, auth_headers):
    headers = auth_headers("admin", "admin123!")
    rules = client.get("/api/v1/policy/rules", headers=headers)
    assert rules.status_code == 200
    created = client.post(
        "/api/v1/policy/rules",
        headers=headers,
        json={
            "name": "temporary rule",
            "effect": "deny",
            "priority": 50,
            "resources": ["resources/admin"],
            "actions": ["manage"],
        },
    )
    assert created.status_code == 201
    rule_id = created.json()["id"]
    assert client.delete(f"/api/v1/policy/rules/{rule_id}", headers=headers).status_code == 204

    rbac = client.get("/api/v1/rbac/matrix", headers=headers)
    assert rbac.status_code == 200
    assert "administrator" in rbac.json()["role_permissions"]

    assistant = client.post(
        "/api/v1/assistant",
        headers=headers,
        json={"message": "Explain default deny"},
    )
    assert assistant.status_code == 200
    assert assistant.json()["mode"] == "project-aware-local"


def test_profile_update_and_documentation(client, auth_headers):
    headers = auth_headers("viewer", "viewer123!")
    profile = client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={"full_name": "Updated Viewer"},
    )
    assert profile.status_code == 200
    assert profile.json()["full_name"] == "Updated Viewer"

    documentation = client.get("/api/v1/documentation", headers=headers)
    assert documentation.status_code == 200
    assert documentation.json()["slug"] == "overview"