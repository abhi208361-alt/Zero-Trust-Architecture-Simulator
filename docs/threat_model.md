# Threat Model - Zero Trust Architecture Simulator

## Overview

This threat model identifies potential security risks, attack vectors, and mitigation strategies for the Zero Trust Architecture Simulator. The analysis follows a structured approach to identify, assess, and document threats while maintaining the educational context of the project.

## Attack Surface Analysis

### 1. Authentication Layer Threats

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Credential stuffing | Medium | Medium | Rate limiting on login endpoint, account lockout after repeated failures, monitor failed authentication attempts |
| JWT token interception | Low | High | HTTPS/TLS for all communications, short token lifespan (15 minutes), token revocation list |
| Token replay attacks | Low | Medium | Token jti (JWT ID) uniqueness enforcement, token expiration validation, single-session enforcement |
| Password guessing | Medium | Medium | Argon2 password hashing (already implemented), rate limiting, no password display in logs |

### 2. Authorization Layer Threats

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Privilege escalation | Low | High | Deny-by-default policy (already implemented), RBAC checks on every operation, resource ownership validation |
| Role assignment bypass | Low | High | Server-side role verification, no frontend-only authorization, audit log all role changes |
| Permission confusion | Medium | Medium | Clear role hierarchy (VIEWER < ANALYST < ADMIN), explicit permission checks, deny-by-default as core principle |

### 3. Policy Engine Threats

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Policy simulation bypass | Low | Medium | Simulated policy engine (educational only), input validation on all policy parameters, risk score bounds checking (0-100) |
| Risk score manipulation | Medium | Medium | Bounded risk_score field (ge=0, le=100), simulated device trust flag, simulated MFA pass flag |
| Unauthorized policy evaluation | Low | Medium | Authentication required before policy eval, user must have valid JWT token |

### 4. Audit Logging Threats

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Log tampering | Low | High | Append-only audit log design (conceptual), correlation IDs for traceability, immutable audit entry structure |
| Information leakage in logs | Medium | High | No passwords or tokens in audit entries, redact sensitive fields, sanitize reason fields |
| Audit log flooding | Low | Medium | Rate limiting on audit log entries, query performance indexes, last 10 logs for dashboard |

## Risk Assessment Matrix

| Risk ID | Category | Description | Likelihood | Impact | Risk Level | Mitigation Status |
|---------|----------|-------------|-----------|--------|-----------|-------------------|
| T1 | Auth | Credential stuffing attack | Medium | Medium | Medium | Rate limiting implemented, lockout considered |
| T2 | Auth | JWT interception | Low | High | Medium | HTTPS enforced, short token lifespan |
| T3 | Auth | Password guessing | Medium | Medium | Medium | Argon2 hashing, rate limiting |
| T4 | Authz | Privilege escalation | Low | High | High | Deny-by-default, RBAC on every op |
| T5 | Authz | Role bypass | Low | High | High | Server-side verification only |
| T6 | Policy | Risk score manipulation | Medium | Medium | Medium | Bounded 0-100, simulated flags |

## Educational Context Mitigations

### Intentional Design Limitations (Accepted Risks)

| Risk | Why Accepted | Mitigation Context |
|------|--------------|-------------------|
| Hardcoded demo passwords | Educational simplicity | Placeholders only, never commit real secrets |
| Allow-all CORS (development) | Development workflow | Documented to restrict before production |
| SQLite for testing | Deterministic fixtures | MongoDB planned for production |
| Demo data only | Educational context | No real systems or users exposed |

### Educational Safety Controls

1. No real system attacks - All scenarios use simulated environments
2. Deterministic fixtures - Predictable test data, no randomness in critical paths
3. Isolated test databases - Each test gets tmp_path SQLite
4. Educational only disclaimer - All materials marked for learning purposes
5. No external system interaction - No attacks against public websites
6. Audit trail for accountability - All actions logged with correlation IDs

## Threat Model Review Schedule

- Initial: Completed as part of Phase 0 documentation
- Periodic: Review before each major phase advancement
- Trigger-based: Review after any significant code changes
- External: Consider third-party review for Phase 1+ production features

## Related Documentation

- DECISIONS.md - Contains 25 architectural decisions including security choices
- TEST_STRATEGY.md - Quality gates A-K include threat model considerations
- FEATURE_TRACEABILITY.md - Maps threats to feature implementation status
- PROGRESS_REPORT.md - Documented findings and risk assessments

## Future Threat Modeling Enhancements (Phase 11+)

1. OWASP Top 10 alignment - Map threats to standardized framework
2. STRIDE analysis - Structure threat identification
3. Security headers - Add HTTP security headers (HSTS, CSP, etc.)
4. Dependency scanning - Regular vulnerability checks on packages
5. Penetration testing - Educational pen-test exercises (safe, isolated)
6. Compliance mapping - Map to relevant educational standards

---
*Threat model is a living document. See DECISIONS.md for architectural security decisions. See TEST_STRATEGY.md for quality gate requirements related to threat modeling.*