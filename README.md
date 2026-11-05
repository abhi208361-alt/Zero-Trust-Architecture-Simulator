# 🛡️ Zero Trust Architecture Simulator
### An Educational Cybersecurity Platform for Identity-Centric Security, Least-Privilege Access & Policy Enforcement

<p align="center">
  <strong>Never Trust. Always Verify.</strong>
</p>

<p align="center">
  A security-focused educational platform demonstrating Zero Trust Architecture (ZTA), Identity and Access Management (IAM), JSON Web Token (JWT) authentication, Role-Based Access Control (RBAC), policy evaluation, risk analysis, and security audit monitoring.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Domain-Cybersecurity-red?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Architecture-Zero%20Trust-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Language-Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
</p>

---

## 📌 1. Project Overview

The **Zero Trust Architecture Simulator** is an educational cybersecurity application designed to demonstrate how modern identity-centric security architectures protect applications, APIs, and sensitive resources.

Traditional perimeter-based security models often assume that users or devices inside a trusted network can be trusted. Zero Trust eliminates this assumption by requiring explicit authentication and authorization for access requests.

This project simulates a Zero Trust security environment in which:

- Every protected access request requires authentication.
- JWT tokens are validated before protected operations.
- Users receive permissions based on their assigned roles.
- Access requests are evaluated against configurable security policies.
- Unauthorized requests are denied by default.
- Security activities are recorded in persistent audit logs.
- Risk analysis helps visualize security-related events.
- Administrators can manage users, policies, and access controls.

The application provides a local educational environment for understanding, implementing, and evaluating Zero Trust security principles.

## 🎯 2. Project Objectives

1. Implement identity-based authentication using JWT.
2. Demonstrate Identity and Access Management (IAM).
3. Enforce Role-Based Access Control (RBAC).
4. Implement the Principle of Least Privilege.
5. Demonstrate default-deny authorization.
6. Simulate centralized security policy evaluation.
7. Maintain security audit trails.
8. Identify and evaluate unauthorized access attempts.
9. Demonstrate secure session management and logout.
10. Provide a visual interface for security monitoring and analysis.

## 🔐 3. Core Security Features

| Security Component | Description |
|---|---|
| JWT Authentication | Token-based user authentication and validation. |
| Session Management | Revocable sessions and secure logout functionality. |
| Identity and Access Management | User identity and role management. |
| Role-Based Access Control | Authorization based on assigned roles. |
| Policy Engine | Configurable security rules and policy evaluation. |
| Default-Deny Architecture | Access is denied unless explicitly authorized. |
| Resource Protection | Resource sensitivity and access-control metadata. |
| Audit Logging | Persistent records of security-related activities. |
| Risk Analysis | Analysis and visualization of security-related risk information. |
| Security Reporting | CSV and PDF audit report exports. |
| API Protection | Authentication and authorization for protected API endpoints. |
| Rate Limiting | Configurable limits for authentication and administrative endpoints. |

## 🏗️ 4. System Architecture

The application follows a backend/frontend architecture with a centralized authorization and policy-evaluation workflow.

```text
                 USER / ADMINISTRATOR
                         |
                         v
                 REACT DASHBOARD
                         |
                         v
                  FASTAPI BACKEND
                         |
              +----------+----------+
              |                     |
              v                     v
       AUTHENTICATION          API ROUTES
          (JWT)                     |
              |                     |
              v                     v
       IDENTITY & IAM          AUTHORIZATION
                                    |
                                    v
                             RBAC ENGINE
                                    |
                                    v
                             POLICY ENGINE
                                    |
                                    v
                           ACCESS DECISION
                                    |
                       +------------+------------+
                       |                         |
                       v                         v
                    ALLOW                      DENY
                       |                         |
                       +------------+------------+
                                    |
                                    v
                              AUDIT LOGGING
                                    |
                                    v
                              SQLITE DATABASE
                                    |
                                    v
                            RISK ANALYSIS
                                    |
                                    v
                            SECURITY REPORTS
```

### Architecture Components

**1. Presentation Layer**

React-based frontend for interacting with the simulator, managing access requests, and viewing security information.

**2. Authentication Layer**

JWT-based authentication to establish and validate user identity.

**3. Authorization Layer**

RBAC and policy evaluation mechanisms determine whether users can access protected resources.

**4. Policy Enforcement Layer**

Evaluates access requests and applies default-deny authorization decisions.

**5. Data Layer**

SQLite provides persistent storage for application data, users, policies, sessions, and audit information.

**6. Monitoring and Reporting Layer**

Provides audit logs, risk analysis, and security report exports.

## 👥 5. Role-Based Access Control

The simulator implements three primary roles:

| Role | Access Level | Responsibility |
|---|---|---|
| Administrator | Administrative | Manage users, policies, and protected administrative operations. |
| Analyst | Analytical | Access permitted analysis and security-related functionality. |
| Viewer | Read-only | View permitted information without administrative privileges. |

Access permissions are determined by the application's authorization policies.

The objective is to ensure that users receive only the permissions required to perform their assigned responsibilities.

## ⚙️ 6. Technology Stack

| Layer | Technology |
|---|---|
| Backend | Python |
| Backend Framework | FastAPI |
| Frontend | React |
| Programming Language | TypeScript / JavaScript |
| Database | SQLite |
| Authentication | JSON Web Tokens (JWT) |
| ORM | SQLAlchemy |
| Database Migrations | Alembic |
| API Documentation | FastAPI OpenAPI / Swagger UI |
| Containerization | Docker |
| Testing | Pytest |
| Security Analysis | Bandit, pip-audit |
| Version Control | Git and GitHub |

## 📂 7. Repository Structure

```text
Zero-Trust-Architecture-Simulator/
│
├── .github/
│   └── workflows/             # CI/CD workflows
│
├── app/
│   ├── api/                   # API routes and dependencies
│   ├── core/                  # Security and application configuration
│   ├── db/                    # Database configuration
│   ├── models/                # Database models
│   ├── schemas/               # Request and response schemas
│   └── services/              # Business and security logic
│
├── frontend/
│   ├── src/                   # React application source
│   ├── public/                # Static assets
│   └── package.json           # Frontend dependencies
│
├── docs/                      # Project documentation
├── migrations/                # Database migration files
├── tests/                     # Automated tests
│
├── .env.example               # Environment configuration template
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
├── requirements.txt
├── pytest.ini
├── mkdocs.yml
└── README.md
```

## 🚀 8. Installation and Setup

### Prerequisites

Install the following tools:

- Windows 11
- Python 3.11 or compatible supported version
- Node.js and npm
- Git
- Visual Studio Code
- Docker Desktop (optional)

### Step 1: Clone the Repository

```powershell
git clone https://github.com/abhi208361-alt/Zero-Trust-Architecture-Simulator.git

cd Zero-Trust-Architecture-Simulator
```

### Step 2: Create a Python Virtual Environment

```powershell
python -m venv .venv
```

Activate the environment:

```powershell
.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, use:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Step 3: Install Backend Dependencies

```powershell
python -m pip install --upgrade pip

pip install -r requirements.txt
```

### Step 4: Configure Environment Variables

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Configure the required environment variables in `.env`.

Generate a strong JWT secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Use the generated value for the JWT secret configuration expected by the application.

Never commit actual secrets, passwords, private keys, or production credentials.

### Step 5: Initialize Database Migrations

```powershell
python -m alembic upgrade head
```

Ensure the database URL is configured correctly before running migrations.

### Step 6: Start the Backend Server

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URL:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### Step 7: Start the Frontend

Open another terminal:

```powershell
cd frontend
```

Install frontend dependencies:

```powershell
npm ci
```

Start the frontend development server:

```powershell
npm run dev
```

Open the local URL displayed by Vite in the terminal.

If the backend is running on a different address, configure `VITE_API_BASE_URL` according to the frontend configuration.

## 🐳 9. Docker Deployment

The repository includes Docker configuration for containerized execution.

Build the Docker image:

```powershell
docker build -t zero-trust-simulator .
```

Generate a JWT secret:

```powershell
$env:JWT_SECRET_KEY = python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Run the container:

```powershell
docker run --rm -p 8000:8000 -e JWT_SECRET_KEY=$env:JWT_SECRET_KEY zero-trust-simulator
```

The repository also provides `docker-compose.yml` for Docker Compose-based deployment.

Review environment configuration, persistent database storage, network exposure, and secret management before deployment.

## 🔍 10. Security Testing and Validation

Security testing is an important part of evaluating a Zero Trust implementation.

The project can be evaluated using authorized tests within an isolated local environment.

### Recommended Security Test Cases

| Test ID | Security Test | Expected Result |
|---|---|---|
| ZT-01 | Valid authentication | Authorized user can authenticate. |
| ZT-02 | Invalid credentials | Authentication is rejected. |
| ZT-03 | Invalid JWT | Protected request is rejected. |
| ZT-04 | Expired JWT | Expired token cannot authorize access. |
| ZT-05 | Unauthorized API request | Request is denied. |
| ZT-06 | RBAC enforcement | Access follows assigned role permissions. |
| ZT-07 | Privilege escalation attempt | Unauthorized privilege changes are prevented. |
| ZT-08 | Default-deny policy | Unmatched access requests are denied. |
| ZT-09 | Session revocation | Revoked sessions cannot be reused. |
| ZT-10 | Audit logging | Security events are recorded. |
| ZT-11 | Rate limiting | Excessive authentication attempts are restricted. |
| ZT-12 | Policy modification | Only authorized users can modify protected policies. |

*These are recommended validation scenarios, not a declaration that every test has already passed. Record actual results and evidence before reporting findings.*

### Running Automated Tests

From the repository root:

```powershell
python -m pytest
```

For detailed test output:

```powershell
python -m pytest -v
```

### Static Security Analysis

Run Bandit:

```powershell
bandit -r app
```

Run dependency vulnerability checks:

```powershell
pip-audit -r requirements.txt
```

Security scanning results should be reviewed and documented. A clean scan does not independently prove that an application is secure.

## 📊 11. API Endpoints

The backend exposes REST API endpoints under `/api/v1`.

| HTTP Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Authenticate users |
| POST | `/auth/logout` | Log out and revoke session |
| PATCH | `/auth/me` | Update current user information |
| POST | `/resources/access` | Submit a resource access request |
| POST | `/policy/evaluate` | Evaluate access policies |
| GET | `/policy/config` | Retrieve policy configuration |
| PUT | `/policy/config` | Update policy configuration |
| GET | `/policy/rules` | Retrieve policy rules |
| POST | `/policy/rules` | Create a policy rule |
| PATCH | `/policy/rules` | Update a policy rule |
| DELETE | `/policy/rules` | Delete a policy rule |
| GET | `/rbac/matrix` | Retrieve the RBAC permission matrix |
| GET | `/resources` | Retrieve available resources |
| GET | `/audit/logs` | Retrieve security audit logs |
| GET | `/risk-analysis` | Retrieve risk analysis information |
| GET | `/reports/csv` | Export audit information as CSV |
| GET | `/reports/pdf` | Export audit information as PDF |
| GET | `/documentation` | Retrieve application documentation |
| POST | `/assistant` | Interact with the local security assistant |

For exact request schemas, authorization requirements, and response formats, consult the application's OpenAPI documentation at `/docs`.

## 🛡️ 12. Zero Trust Security Principles

This project demonstrates concepts aligned with the Zero Trust Architecture guidance in NIST SP 800-207.

| Zero Trust Principle | Project Demonstration |
|---|---|
| Never Trust, Always Verify | Authentication and authorization for protected requests. |
| Least Privilege Access | Role-based permission restrictions. |
| Assume Breach | Default-deny access decisions and audit monitoring. |
| Verify Explicitly | JWT validation and identity verification. |
| Continuous Evaluation | Policy evaluation for access requests. |
| Monitor and Record | Persistent security audit logs. |
| Protect Resources | Resource-level authorization controls. |

This is an educational mapping of selected Zero Trust principles, not a formal NIST compliance certification.

## ⚠️ 13. Security Limitations

This project is an educational simulator, not a complete enterprise Zero Trust deployment.

Important limitations:

- It does not automatically enforce access policies on external networks or infrastructure.
- It does not replace a production Identity Provider.
- SQLite is intended for local educational use in this implementation.
- Simulated access decisions should not be interpreted as real-world network isolation.
- Risk analysis does not independently establish that a system is free from attacks.
- Production deployment would require additional security architecture, operational controls, monitoring, and independent assessment.

## 🔒 14. Ethical Use and Responsible Testing

This project is developed strictly for educational cybersecurity research, secure software development, and authorized security testing.

All security testing must:

1. Be performed on systems owned by the tester or with explicit authorization.
2. Use isolated local environments or virtual machines.
3. Use synthetic accounts and non-sensitive test data.
4. Avoid unauthorized access to third-party systems.
5. Avoid disruption of production services.
6. Document security findings responsibly.
7. Follow applicable cybersecurity laws and institutional guidelines.

**Unauthorized testing against external systems is strictly prohibited.**

## 📚 15. References and Standards

- [NIST SP 800-207 – Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [JWT Introduction](https://jwt.io/introduction)

## 🎓 16. Academic Project Information

**Project Title:** Zero Trust Architecture Simulator (Educational)

**Domain:** Cybersecurity / Information Security

**Project Category:** Zero Trust Security, IAM, RBAC and Application Security

**Purpose:** Academic learning, security simulation, access-control implementation, and authorized security testing.

**Milestone 1:** Scope, authorized testing rules, laboratory setup, architecture, and implementation plan.

**Milestone 2:** Security testing, evidence collection, findings, risk assessment, remediation recommendations, and final security report.

## 👨‍💻 17. Author

**Abhilash B.**

Cybersecurity and Computer Science Engineering Student

GitHub: [@abhi208361-alt](https://github.com/abhi208361-alt)

Project Repository: [Zero Trust Architecture Simulator](https://github.com/abhi208361-alt/Zero-Trust-Architecture-Simulator)

---

## ⭐ Support the Project

If you find this project useful for learning about Zero Trust Architecture, application security, and access-control mechanisms, consider giving the repository a star.

Contributions, suggestions, and constructive feedback are welcome.

---

<p align="center">
  <strong>ZERO TRUST ARCHITECTURE SIMULATOR</strong>
  <br/>
  <em>Never Trust. Always Verify. Enforce Least Privilege.</em>
</p>
