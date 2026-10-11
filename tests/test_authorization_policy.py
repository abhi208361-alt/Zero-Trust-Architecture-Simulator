

def test_viewer_allowed_and_denied_paths(client, auth_headers):
    viewer_headers = auth_headers("viewer", "viewer123!")
    allowed = client.post(
        "/api/v1/resources/access",
        headers=viewer_headers,
        json={
            "username": "viewer",
            "resource": "resources/public",
            "action": "read",
            "simulated_device_trusted": True,
            "simulated_risk_score": 10,
        },
    )
    assert allowed.status_code == 200

    denied = client.post(
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
    assert denied.status_code == 403


def test_analyst_allowed_security_events(client, auth_headers):
    analyst_headers = auth_headers("analyst", "analyst123!")
    response = client.post(
        "/api/v1/resources/access",
        headers=analyst_headers,
        json={
            "username": "analyst",
            "resource": "resources/security-events",
            "action": "read",
            "simulated_device_trusted": True,
            "simulated_risk_score": 30,
        },
    )
    assert response.status_code == 200


def test_unknown_resource_and_default_deny(client, auth_headers):
    headers = auth_headers("admin", "admin123!")
    response = client.post(
        "/api/v1/resources/access",
        headers=headers,
        json={
            "username": "admin",
            "resource": "resources/non-existent",
            "action": "read",
            "simulated_device_trusted": True,
            "simulated_risk_score": 5,
        },
    )
    assert response.status_code == 403


def test_untrusted_device_denied_for_high_sensitivity(client, auth_headers):
    headers = auth_headers("admin", "admin123!")
    response = client.post(
        "/api/v1/resources/access",
        headers=headers,
        json={
            "username": "admin",
            "resource": "resources/admin",
            "action": "manage",
            "simulated_device_trusted": False,
            "simulated_risk_score": 5,
        },
    )
    assert response.status_code == 403


def test_risk_threshold_denial(client, auth_headers):
    headers = auth_headers("admin", "admin123!")
    update = client.put("/api/v1/policy/config", headers=headers, json={"risk_threshold": 20})
    assert update.status_code == 200

    response = client.post(
        "/api/v1/resources/access",
        headers=headers,
        json={
            "username": "admin",
            "resource": "resources/admin",
            "action": "manage",
            "simulated_device_trusted": True,
            "simulated_risk_score": 50,
        },
    )
    assert response.status_code == 403


def test_unauthorized_role_change_and_privilege_escalation_rejected(client, auth_headers):
    viewer_headers = auth_headers("viewer", "viewer123!")
    users = client.get("/api/v1/users", headers=viewer_headers)
    assert users.status_code == 403

    role_change = client.patch("/api/v1/users/1", headers=viewer_headers, json={"role": "administrator"})
    assert role_change.status_code == 403
