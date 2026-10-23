# Zero Trust Architecture Simulator

A local educational simulator for Zero Trust security, RBAC, least-privilege access, audit logging, and risk-oriented decision-making.

## Features
- JWT-based authentication
- Role-based authorization
- Default-deny access decisions
- Policy evaluation engine
- Persistent SQLite database
- Audit log storage
- React dashboard for simulator interactions
- Local-only educational use

## Roles
- viewer
- analyst
- administrator

## Default users
- viewer / viewer123!
- analyst / analyst123!
- admin / admin123!

Note:
These are development/demo credentials only and should be changed or overridden in a real environment.

## Backend setup
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
python -c "from app.main import app; print(app)"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000