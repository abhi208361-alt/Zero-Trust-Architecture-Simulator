from __future__ import annotations

import re
from typing import Any

def local_assistant_reply(message: str) -> str:
    text = (message or "").strip()
    if not text:
        return "Please provide a security question to analyze."

    lower = text.lower()

    if "default deny" in lower or "default-deny" in lower or "deny" in lower:
        return (
            "Default-deny means the system only grants access when explicit policy and identity checks pass. "
            "If the request is unknown, untrusted, or missing authorization, it is denied by design."
        )

    if "policy" in lower:
        return (
            "Policies should be explicit, deterministic, and least-privilege based. "
            "They should evaluate roles, resources, conditions, and risk before granting access."
        )

    if "audit" in lower or "log" in lower:
        return (
            "Audit events should capture who performed the action, what resource was accessed, the decision, "
            "the reason, and the risk context. This supports investigation and forensic review."
        )

    if "risk" in lower:
        return (
            "Risk scoring should combine identity posture, policy conditions, device trust, MFA state, "
            "and unusual access behavior. High risk should trigger stronger denials or additional controls."
        )

    if "mfa" in lower or "device" in lower:
        return (
            "MFA and trusted-device checks are strong controls for high-sensitivity resources. "
            "When either is missing, the system should deny or require a stronger verification path."
        )

    if "admin" in lower:
        return (
            "Administrative actions should be strictly role-bound and logged. "
            "Only administrators with a valid token and active account should perform administrative changes."
        )

    if "zero trust" in lower:
        return (
            "Zero Trust assumes no implicit trust. Every access decision should verify identity, device posture, "
            "policy fit, and risk before allowing the access request."
        )

    return (
        "I’m running in local fallback mode. Based on the project’s zero-trust model, the safest response is "
        "to verify identity, validate the resource and action, confirm device trust and MFA state, "
        "and ensure the risk score remains under policy thresholds."
    )