from __future__ import annotations

import re
from typing import Any


PROJECT_KNOWLEDGE = {
    "authentication": "JWT bearer tokens authenticate users. Active accounts are required, tokens can be revoked on logout, and passwords are stored as hashes.",
    "authorization": "RBAC has viewer, analyst, and administrator roles. Analysts can read audit data and create analysis; administrators can manage users, policies, reports, and security testing.",
    "policy": "Access decisions evaluate identity, resource, action, device trust, MFA, and risk. The default posture is deny unless an explicit policy allows the request.",
    "audit": "Every policy decision records the actor, resource, action, allow or deny result, reason, risk score, and UTC timestamp. Analysts and administrators can review audit events.",
    "risk": "Risk scoring uses device trust, MFA, resource sensitivity, and request context. Higher scores can deny access or require stronger verification.",
    "pages": "The project includes dashboard, access simulator, users and roles, policy management, audit logs, network map, reports, risk analysis, security testing, investigations, AI assistant, documentation, and settings pages.",
    "backend": "The backend is FastAPI with SQLAlchemy and SQLite, organized into API routes, models, schemas, services, authentication, RBAC, policy evaluation, reporting, and risk scoring.",
}


def local_assistant_reply(message: str, context: dict[str, Any] | None = None) -> str:
    text = (message or "").strip()
    if not text:
        return "Please provide a security question to analyze."

    lower = text.lower()

    if "what can you do" in lower or "help" in lower:
        return (
            "I can guide you through this Zero Trust Architecture Simulator: authentication and RBAC, "
            "policy evaluation, audit logs, risk analysis, security investigations, network topology, reports, "
            "security tests, and project configuration. Ask about a page, a control, an access decision, or a "
            "recommended investigation step."
        )

    if "current" in lower and ("threat" in lower or "incident" in lower):
        return (
            f"The project currently has {context.get('denied_events', 0) if context else 0} denied access events "
            "in the audit log. Open Security Investigations for incident details, source IPs, severity, and "
            "actions such as blocking a source or reviewing related activity."
        )

    if "risk score" in lower or "risk posture" in lower:
        return (
            "Risk scores are evaluated from the access request context and policy controls. Review Risk Analysis "
            "for total, high, medium, and low risk assets; investigate scores of 60 or above; and verify device "
            "trust, MFA, resource sensitivity, and the matching policy rule."
        )

    if "report" in lower:
        return (
            "Open Reports to choose a report type and time range. Generate a PDF for a formatted security review "
            "or export CSV for analysis. Reports are generated from the audit log and include access decisions, "
            "resources, reasons, and risk scores."
        )

    if "network" in lower or "topology" in lower:
        return (
            "Network Map shows the Internet, Zero Trust Gateway, Firewall, trusted employees, protected servers, "
            "secure databases, and limited-access guests. Use it to review device posture, active connections, "
            "threat activity, traffic trends, and security zones."
        )

    if "security test" in lower:
        return (
            "Security Testing validates token validity, RBAC enforcement, and risk-threshold behavior. "
            "Administrators can run the checks from the Security Testing page and use the details to confirm "
            "that the expected control is enforced."
        )

    if "project" in lower or "architecture" in lower or "backend" in lower:
        return (
            "This project is a FastAPI + SQLAlchemy backend with a React/Vite frontend. It demonstrates JWT "
            "authentication, role-based access control, least-privilege policy evaluation, device/MFA/risk "
            "checks, audit logging, reports, risk analysis, investigations, network visibility, and local "
            f"project-aware assistance. {PROJECT_KNOWLEDGE['backend']}"
        )

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

    live = ""
    if context:
        live = (
            f" Current live context: {context.get('audit_events', 0)} audit events, "
            f"{context.get('denied_events', 0)} denied requests, and "
            f"{context.get('active_users', 0)} active users."
        )
    return (
        "For this project, start by identifying the user and role, validating the requested resource and action, "
        "checking device trust and MFA, evaluating risk against the policy threshold, and recording the decision "
        "in the audit log. If you share the exact page, endpoint, error, or scenario, I can give a concrete "
        "step-by-step answer." + live
    )