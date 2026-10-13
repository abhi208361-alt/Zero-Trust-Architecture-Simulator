# Local Setup Guide - Zero Trust Architecture Simulator

## Prerequisites

### Software Requirements
- **Python**: 3.12 or 3.13 (tested with 3.13.7)
- **pip**: Python package manager
- **Git**: For version control (optional, for cloning)

### Operating Systems
- **Windows**: 10 or 11 (WSL2 recommended for Linux tooling)
- **macOS**: 12+ (Monterey or newer)
- **Linux**: Any modern distribution with Python 3.12+

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/your-organization/zero-trust-architecture-simulator.git
cd zero-trust-architecture-simulator
```

### 2. Create a Virtual Environment
```bash
# Using venv (built-in)
python -m venv .venv

# Activate the virtual environment

# On Windows PowerShell
.venv\Scripts\Activate.ps1

# On macOS/Linux
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

#### Required Packages
The following packages are installed via requirements.txt:
- **fastapi**: Web framework (version 0.113.0+)
- **uvicorn**: ASGI server (version 0.30.0+)
- **sqlalchemy**: ORM (version 2.0.0+)
- **passlib[argon2]**: Password hashing (version 1.0.0+)
- **pytest**: Testing framework (version 8.0.0+)
- **pytest-asyncio**: Async test support (version 0.23.0+)
- **argon2-cffi**: Argon2 backend for passlib
- **python-dotenv**: Environment variable loading

### 4. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your preferred settings:

| Variable | Default | Description |
|----------|---------|-------------|
| SECRET_KEY | demo-secret-key-change-me | HMAC secret for JWT signing |
| ACCESS_TOKEN_EXPIRE_MINUTES | 15 | Access token expiry in minutes |
| ALLOWED_ORIGINS | * | CORS allowed origins (comma-separated) |
| DATABASE_URL | sqlite:///./test.db | Database connection string |
| PASSWORD_HASHING_BACKEND | argon2 | Password hashing algorithm |

### 5. Initialize the Database
```bash
python -m app.main
```

This will:
- Create the SQLite database file
- Seed default users (viewer, analyst, admin)
- Create all database tables and indexes
- Print startup message confirming initialization

### 6. Run the Application
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The application will be available at http://localhost:8000

### 7. Verify Installation
Open your browser and visit:
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

These FastAPI-generated docs show all available endpoints, request/response models, and authentication requirements.

## Development Commands

### Run Tests
```bash
pytest tests/ -v
```

### Run Specific Test File
```bash
pytest tests/test_auth.py -v
pytest tests/test_authorization_policy.py -v
pytest tests/test_audit_and_integration.py -v
```

### Check Code Quality
```bash
# Linting (if configured)
pylint app/

# Type checking (if configured)
mypy app/
```

## Directory Structure

```
zero-trust-architecture-simulator/
├── app/
│   ├── main.py              # FastAPI app creation
│   ├── config.py            # Settings, environment variables
│   ├── core/                # Core security logic
│   ├── db/                  # Database initialization, seeding
│   ├── models/              # SQLAlchemy models (user, audit, policy)
│   ├── api/                 # API routes and dependencies
│   │   ├── routes.py        # All endpoint definitions
│   │   ├── deps.py          # DB dependency, auth deps
│   │   └── schemas/         # Pydantic request/response models
│   └── services/            # Business logic
│       ├── auth_service.py  # Authentication operations
│       ├── rbac_service.py  # Role-based access control
│       ├── policy_service.py # Policy engine evaluation
│       └── audit_service.py # Audit logging operations
├── tests/
│   ├── test_auth.py         # Authentication tests
│   ├── test_authorization_policy.py  # Authorization tests
│   └── test_audit_and_integration.py # Integration tests
├── docs/
│   ├── REPOSITORY_AUDIT.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── FEATURE_TRACEABILITY.md
│   ├── TEST_STRATEGY.md
│   ├── DECISIONS.md
│   ├── PROJECT_STATUS.md
│   ├── PROGRESS_REPORT.md
│   ├── architecture.md      # (Phase 1 output)
│   ├── data_flow.md         # (Phase 1 output)
│   ├── threat_model.md      # (Phase 1 output)
│   └── local_setup.md       # (Phase 1 output)
├── requirements.txt
├── .env.example
└── README.md
```

## Troubleshooting

### Common Issues

1. **Port 8000 already in use**: Kill the process using port 8000 or use a different port
2. **Database locked error**: Ensure no other process is using the database file, use separate DB per test
3. **Import errors**: Ensure virtual environment is activated
4. **Test isolation failures**: Each test gets its own tmp_path SQLite; avoid sharing DB state
5. **argon2 errors**: Ensure argon2-cffi is installed (`pip install argon2-cffi`)

### Need Help?
- Check the API docs at http://localhost:8000/docs
- Review DECISIONS.md for architectural decisions
- Review PROJECT_STATUS.md for current status
- Open an issue on the GitHub repository

## Educational Safety Notes

- This simulator uses **deterministic test fixtures** only
- All credentials are **demo placeholders** (viewer123!, analyst123!, admin123!)
- No real systems or public websites are targeted
- All scenarios are **isolated within the test database**
- This tool is for **educational purposes only**