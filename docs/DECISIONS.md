# Decisions Document

## Architecture Decisions

### 2. Frontend Framework: React + Vite
- **Decision**: Use React with Vite build tool
- **Rationale**: Fast HMR, modern tooling, large ecosystem, compatible with existing codebase
- **Alternatives considered**: Create React App, Next.js, Vue.js, Angular
- **Status**: Chosen - preserving existing implementation
### 3. Database: SQLite (Educational) / MongoDB (Per Spec)
- **Decision**: Use SQLite for local development and testing; MongoDB documented as the target per project specification
- **Rationale**: SQLite is zero-config for local educational sim; MongoDB specified in requirements for persistence
- **Rationale note**: Both supported; SQLite for dev, MongoDB for production-like persistence
- **Status**: SQLite currently implemented, MongoDB roadmap
### 4. Authentication: JWT with HS256
- **Decision**: Use JSON Web Tokens signed with HS256 algorithm
- **Rationale**: Industry standard for API auth, supports expiration, issuer, audience claims
- **JWT Claims**: sub, exp, iat, jti, token_type, iss, aud
- **Token Lifetime**: 15 minutes (configurable via ACCESS_TOKEN_EXPIRE_MINUTES)
### 5. RBAC: Three-Role Model
- **Decision**: Implement VIEWER, ANALYST, ADMINISTRATOR roles with explicit permissions
- **Rationale**: Clear separation of duties for educational simulator
- **ADMIN**: Manage users/roles/policies, view audit, execute admin actions
- **ANALYST**: View security events, investigate scenarios, authorized analysis only
### 6. Password Hashing: Argon2
- **Decision**: Use Argon2 password hashing library
- **Rationale**: Memory-hard function, resistant to GPU attacks, modern standard
- **Alternatives considered**: bcrypt, scrypt, PBKDF2
- **Status**: Implemented with verify_password/get_password_hash in security.py
### 7. Persistence: SQLAlchemy with SQLite
- **Decision**: Use SQLAlchemy ORM with SQLite for local development
- **Rationale**: Pythonic ORM, migrations possible with Alembic, zero config for local sim
- **MongoDB noted**: Per project specification for persistence roadmap
- **Status**: Implemented with models in app/models/, session in app/db/
### 8. Token Strategy
- **Decision**: Short-lived access tokens with JTI-based revocation
- **Access Token**: 15 minutes, signed HS256
- **Revocation**: JTI added to RevokedToken table on logout
- **Cleanup**: Expired revocation entries cleaned on token verification
### 9. Audit Logging
- **Decision**: Log all authentication and authorization events
- **Fields**: correlation_id, event_type, actor, resource, action, result, reason, risk_score, metadata_json
- **Indexes**: created_at, result, actor_id for query performance
- **Safety**: No passwords or tokens logged in reason field
### 10. CORS Configuration
- **Decision**: Initially allow all origins (allow_defaults=True) for educational simplicity
- **Rationale**: Educational environment; production would restrict to specific origins
- **Future**: Add restrictive CORS for production deployment
- **Status**: Using FastAPI-CORS with defaults
### 11. Docker vs Local Development
- **Decision**: Support both local Windows development and Docker Compose deployment
- **Rationale**: Flexibility for different developer environments
- **Local**: Python directly with virtual environment
- **Docker**: docker-compose.yaml for frontend, backend, MongoDB services
### 12. Hardcoded Demo Passwords
- **Decision**: Demo users have pre-configured passwords (viewer123!, analyst123!, admin123!)
- **Rationale**: Educational convenience for immediate use
- **Concern**: Plaintext passwords in seed data; must be hashed before storage
- **Action**: Passwords are hashed via get_password_hash during init_db.py seed
### 13. Environment Variables
- **Decision**: Use pydantic BaseSettings with .env file support
- **Rationale**: Separate config from code, easy Windows environment management
- **Key Vars**: JWT_SECRET_KEY, DATABASE_URL, RISK_THRESHOLD, etc.
- **Security**: JWT_SECRET_KEY must be rotated before production use
### 14. Error Handling Philosophy
- **Decision**: Consistent API error responses, safe messages to users, detailed logs internally
- **Rationale**: Users see helpful messages without exposed secrets; developers get diagnostics
- **Pattern**: ValidationError 422, AuthError 401, AuthzError 403, Unexpected 500 to user
- **Never**: Stack traces, credentials, or secrets in user-facing responses
### 15. Educational Safety Rules
- **Decision**: Project remains strictly educational; no real exploitation
- **Rationale**: Learning environment; must not enable actual attacks
- **Boundaries**: No public website attacks, no persistence, no credential theft, no destructive payloads
- **Enforcement**: All scenarios are deterministic and reproducible
### 16. Test Database Strategy
- **Decision**: Use tmp_path with isolated SQLite database for each test
- **Rationale**: Tests must not corrupt development data
- **Implementation**: conftest.py creates fresh DB per test session
- **JWT Secret**: Monkeypatched in tests for isolation
### 17. Dependency Management
- **Decision**: Pin dependency versions in requirements.txt
- **Rationale**: Reproducible builds, avoid breaking changes
- **Tool**: pip with requirements.txt; pip-compile for lockfile consideration
- **Status**: requirements.txt exists, lockfile not yet generated
### 18. Report Generation
- **Decision**: Use ReportLab for PDF generation from Python backend
- **Rationale**: Pure Python, no external PDF dependencies needed beyond ReportLab
- **Alternative**: WeasyPrint, xhtml2pdf considered but ReportLab chosen
- **Status**: Not yet implemented (Phase 13)
### 19. Quality Gate Progression
- **Decision**: Advance through gates A->K sequentially; gate must pass before continuing
- **Rationale**: Ensures baseline quality before feature development
- **Failure handling**: Diagnose root cause, fix smallest safe issue, rerun gate
- **Status**: Framework defined in implementation plan
### 20. Docker vs Local Development
- **Decision**: Support both local Windows development and Docker Compose deployment
- **Rationale**: Flexibility for different developer environments
- **Local**: Python directly with virtual environment
- **Docker**: docker-compose.yaml for frontend, backend, MongoDB services
### 21. Future Considerations: MongoDB Migration
- **Decision**: Plan for MongoDB migration when moving from educational to production
- **Rationale**: Project specification targets MongoDB for persistence
- **Timeline**: After core features validated with SQLite
- **Considerations**: ODM selection (Beanie, MongoEngine), data schema migration, connection pooling
### 22. HTTPS/TLS for Local Dev
- **Decision**: Self-signed certificates or http://localhost for educational use
- **Rationale**: Educational environment doesn't require production TLS
- **Future**: Add HTTPS configuration for closer-to-production setup
- **Status**: Not implemented
### 23. Rate Limiter Persistence
- **Decision**: In-memory rate limiter acceptable for local educational use
- **Rationale**: Simplicity for simulator; distributed cache (Redis) for production
- **Future**: Add Redis-backed rate limiting for production deployment
- **Status**: In-memory defaultdict in deps.py
### 24. OpenAPI Documentation
- **Decision**: Generate from FastAPI route annotations; manual enhancements where needed
- **Rationale**: Automatic documentation keeps in sync with code
- **Future**: Manual enhancements for educational clarity
- **Status**: FastAPI auto-generates, not yet customized
### 25. Frontend Authorization
- **Decision**: Frontend hides buttons/pages based on role; backend enforces authorization on every endpoint
- **Rationale**: Defense-in-depth; hiding buttons is UX, not security control
- **Important**: Direct API calls must still pass backend authorization
- **Status**: Partially implemented; needs verification
- **Status**: Documented, not yet implemented
- **Status**: Docker configuration needed (Phase 10)
- **Status**: Implemented and verified
- **Status**: Core principle throughout development
- **Status**: Partially implemented, improvement needed
- **Status**: .env.example provided with guidance
- **Note**: Development-only credentials; never use in production
- **Status**: Docker configuration needed (Phase 10)
- **Status**: Implemented in app/models/audit.py and app/services/audit.py
- **Status**: Implemented in app/services/security.py
- **VIEWER**: Read permitted resources only, no administration capabilities
- **Deny-by-default**: If permission not explicitly mapped, access denied
- **Status**: Implemented with ROLE_PERMISSIONS in rbac.py
- **Revocation**: JTI-based revocation table with expiration tracking
- **Status**: Implemented and verified
### 1. Backend Framework: FastAPI
- **Decision**: Use FastAPI for the Python backend
- **Rationale**: Modern, fast, built-in OpenAPI/Swagger documentation, dependency injection, easy JWT integration
- **Alternatives considered**: Flask, Django, FastAPI with different ASGI server
- **Status**: Chosen - implementation underway