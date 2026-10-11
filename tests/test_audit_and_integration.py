
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
