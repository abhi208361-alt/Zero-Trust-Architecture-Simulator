# Zero Trust Architecture Simulator

A local educational simulator for Zero Trust security, RBAC, least-privilege access, audit logging, and risk-oriented decision-making.

## Features
- JWT-based authentication
- Revocable sessions with secure logout
- Role-based authorization
- Policy-rule CRUD with default-deny evaluation
- RBAC matrix and resource sensitivity metadata
- Local security assistant and documentation API
- Default-deny access decisions
- Policy evaluation engine
- Persistent SQLite database
- Audit log storage
- CSV and PDF audit exports
- React dashboard for simulator interactions
- Local-only educational use

## Roles
- viewer
- analyst
- administrator

Demo users are disabled by default. For isolated local demonstrations only, set
`ENABLE_DEMO_DATA=true` and provide `VIEWER_PASSWORD`, `ANALYST_PASSWORD`, and
`ADMIN_PASSWORD` through environment variables. Never use fixed demo passwords
in a shared or production deployment.

## Backend setup
```

## Frontend setup

```bash
cd frontend
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` when the API is not running at
`http://127.0.0.1:8000/api/v1`.

## Docker

```bash
docker build -t zero-trust-simulator .
export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
docker run --rm -p 8000:8000 \
  -e JWT_SECRET_KEY="$JWT_SECRET_KEY" \
  zero-trust-simulator
```

The repository also includes `docker-compose.yml`; use it with Docker Compose
when the Compose plugin is installed.

## API highlights

- `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `PATCH /api/v1/auth/me`
- `POST /api/v1/resources/access` and `POST /api/v1/policy/evaluate`
- `GET|PUT /api/v1/policy/config`, `GET|POST|PATCH|DELETE /api/v1/policy/rules`
- `GET /api/v1/rbac/matrix`, `GET /api/v1/resources`
- `GET /api/v1/audit/logs`, `GET /api/v1/risk-analysis`
- `GET /api/v1/reports/csv`, `GET /api/v1/reports/pdf`
- `GET /api/v1/documentation`, `POST /api/v1/assistant`

The simulator models controls locally; it does not enforce policies against
external infrastructure.powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
python -c "from app.main import app; print(app)"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000