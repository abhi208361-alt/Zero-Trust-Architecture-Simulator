# Architecture.md - Zero Trust Architecture Simulator

## System Overview

The Zero Trust Architecture Simulator is an educational Python application demonstrating core Zero Trust security principles through a simulated environment. The system is built as a single FastAPI application with modular components, intentionally designed as a monolith rather than microservices for educational clarity.

## Core Principles Demonstrated

1. **Never trust, always verify** - Every API request undergoes full authentication and authorization checks, regardless of origin
2. **Explicit verification** - Identity, device trust, and risk context are explicitly validated on every operation
3. **Least privilege** - Roles (VIEWER, ANALYST, ADMINISTRATOR) have strictly defined permissions; deny-by-default policy enforced
4. **Assume breach** - All inputs validated, errors handled minimally, no secrets in logs, audit logging of all events
5. **Defense in depth** - Multiple validation layers: JWT signature, RBAC checks, policy engine evaluation, resource sensitivity tags

## Trust Boundaries

### Internal Trust Boundary
- Within the application: Components trust each other via internal interfaces, but all external-facing operations still undergo full validation
- Database layer: SQLAlchemy ORM with connection pooling; all writes go through authenticated API endpoints
- Audit system: All security-relevant operations logged with correlation IDs, immutable audit trail

### External Trust Boundary
- Client/API boundary - All external requests must present valid JWT access tokens
- Token trust scope - Short-lived access tokens (15 minutes) with HMAC HS256 signing
- Refresh token policy - If supported, refresh tokens have different scope and rotation policies
- CORS boundary - Configured per-environment; development allows all origins, production restricts to specific domains