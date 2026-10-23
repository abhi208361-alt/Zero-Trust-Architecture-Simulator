from __future__ import annotations

from typing import Any


def compute_risk_score(
    *,
    identity_verified: bool,
    device_trusted: bool,
    mfa_passed: bool,
    request_risk_score: int,
    resource_sensitivity: str,
    user_role: str,
    policy_denial_count: int = 0,
) -> dict[str, Any]:
    score = 0

    if not identity_verified:
        score += 25

    if not device_trusted:
        score += 20

    if not mfa_passed:
        score += 15

    score += request_risk_score

    sensitivity_map = {
        "low": 5,
        "medium": 15,
        "high": 25,
    }
    score += sensitivity_map.get(resource_sensitivity, 0)

    if user_role == "viewer":
        score += 5
    elif user_role == "analyst":
        score += 10
    elif user_role == "administrator":
        score += 8

    score += min(policy_denial_count * 5, 25)
    score = max(0, min(score, 100))

    if score >= 80:
        severity = "critical"
    elif score >= 60:
        severity = "high"
    elif score >= 35:
        severity = "medium"
    else:
        severity = "low"

    return {
        "score": score,
        "severity": severity,
        "reasons": [
            "identity verification failed" if not identity_verified else None,
            "device not trusted" if not device_trusted else None,
            "MFA not completed" if not mfa_passed else None,
            "high resource sensitivity" if resource_sensitivity == "high" else None,
            "recent policy denials observed" if policy_denial_count > 0 else None,
            "risk score elevated by request context" if request_risk_score > 30 else None,
        ],
    }