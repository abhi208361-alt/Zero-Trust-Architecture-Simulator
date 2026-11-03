# Agent Implementation Plan

## Existing architecture

The repository is a local Zero Trust simulator with a FastAPI API under `app/`, SQLAlchemy models backed by SQLite, and a React/Vite client under `frontend/`. Authentication uses Argon2 password hashes and JWT bearer tokens. Policy decisions are made by `app/services/policy_engine.py`, persisted access decisions are written to `audit_logs`, and the frontend consumes the `/api/v1` API.

## Current feature inventory

- Authentication: login, registration, current-user lookup, seeded demo users.
- Authorization: viewer, analyst, and administrator role permissions.
- Zero Trust evaluation: identity, account status, token validity, resource sensitivity, device signal, MFA signal, RBAC, and risk threshold checks.
- Operations: dashboard metrics, audit logs, policy configuration, security-test endpoint, CSV/PDF report services, documentation and policy-rule seed models.
- Frontend: routed dashboard, access simulator, users, policies, audit logs, reports, risk analysis, assistant, settings, and documentation pages.
- Delivery: requirements file, GitHub Actions workflow, Docker assets in `docs/`, and an isolated pytest suite.

## Gaps and known errors found

- Application initialization had no `create_app()` factory, so isolated tests could not create databases.
- Models used two separate SQLAlchemy declarative bases; seeded documentation, policy rules, users, and revoked tokens could not share one metadata registry.
- Database seeding passed fields not present on the active `User` model.
- Access and audit API contracts were incomplete (`/resources/access` was missing and audit consumers expected `result`).
- Logout did not revoke JWTs.
- Public registration accepted a requested role instead of enforcing least privilege.
- Report generation referenced obsolete audit columns.
- CORS was wildcarded with credentials, the frontend API helper had a malformed authorization header, and the CI workflow had a YAML step typo.
- The frontend build requires running from `frontend/`; Python dependencies require an isolated environment.

## Proposed architecture

Keep the current modular monolith. `app/main.py` owns application construction and lifecycle initialization; `app/api/routes.py` owns transport contracts; `app/services/` owns policy, audit, risk, report, and assistant behavior; `app/models/` owns persistent entities; and `frontend/src/api.ts` is the single client API boundary. Use one SQLAlchemy `Base`, default-deny policy evaluation, explicit role checks, and dependency-injected sessions.

## Implementation phases

1. Audit and baseline documentation.
2. Stabilize application factory, metadata, seeding, and configuration.
3. Harden authentication, logout, token revocation, and registration.
4. Align access simulation, audit, policy, and report APIs.
5. Complete frontend API integration and page behavior.
6. Add device/session/monitoring/reporting coverage.
7. Harden CI, Docker, dependency checks, and documentation.
8. Run backend tests, frontend build, API smoke checks, and final acceptance audit.

## Testing requirements

- `./.venv/bin/python -m pytest tests/ --tb=short`
- `cd frontend && npm run build`
- API smoke checks for health, registration, login, protected routes, access decisions, logout revocation, policy updates, and exports.
- CI validation for tests, Bandit, dependency audit, linting, formatting, documentation, and frontend build.

## Status

The backend and frontend are executable with policy-rule CRUD, RBAC/resource metadata, profile settings, documentation, assistant, dynamic risk analysis, audit filters, report downloads, and revocable logout. The local regression suite, frontend build/type check, documentation build, Bandit, Docker build/health smoke test, and API smoke checks pass. Hosted CI and browser automation remain external verification items.
