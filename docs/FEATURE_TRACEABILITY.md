| User registration | Not implemented | Add /auth/register endpoint with password hashing | N/A | NOT_STARTED |
| Secure login | Working | Ensure rate limiting, audit logging, token revocation | test_auth.py | COMPLETED |
| Password hashing | Working (argon2) | Verify in init_db.py and login flow | test_auth.py | COMPLETED |
| Short-lived access tokens | Working | HS256 JWT with 15-min expiration | test_auth.py | COMPLETED |
| Token signature validation | Working | JWT HS256 verify with secret from env | test_auth.py | COMPLETED |
| Token expiration validation | Working | Past expiration returns 401 | test_auth.py | COMPLETED |
| Issuer/audience validation | Partial | Add Audience claim to tokens | N/A | PENDING |
| Malformed token rejection | Working | Bearer token format validation | test_auth.py | COMPLETED |
| Revoked token rejection | Working | JTI-based revocation check | test_auth.py, test_audit_and_integration.py | COMPLETED |
| Secure secret config | Working | .env.example with JWT_SECRET_KEY | requirements.txt | COMPLETED |
| Safe auth error messages | Working | No password/token leakage in responses | test_auth.py | COMPLETED |
| Account activation/deactivation | Working | is_active flag, disabled account returns 403 | test_auth.py | COMPLETED |
| Role assignment/permission management | Working | ROLE_PERMISSIONS dict in rbac.py | test_authorization_policy.py | COMPLETED |
| Audit records for identity changes | Working | All auth events logged with correlation_id | test_audit_and_integration.py | COMPLETED |
| Token rotation/revocation | Working | Logout revokes token JTI | test_auth.py | COMPLETED |
| ADMIN role | Working | Manage users, roles, policies, audit | test_authorization_policy.py | COMPLETED |
| ANALYST role | Working | View security events, read audit logs | test_authorization_policy.py | COMPLETED |
| VIEWER role | Working | Read permitted resources only | test_authorization_policy.py | COMPLETED |
| Deny-by-default | Working | Unknown resources/actions denied by default | test_authorization_policy.py | COMPLETED |
| Authz check on every operation | Working | require_role dependency on protected endpoints | test_authorization_policy.py | COMPLETED |
| Resource ownership validation | Partial | Need to implement resource-level checks | N/A | PENDING |
| Privilege escalation prevention | Working | viewer cannot change role to administrator | test_authorization_policy.py | COMPLETED |
| Unauthorized role assignment prevention | Working | require_role dependency restricts changes | test_authorization_policy.py | COMPLETED |
| Authorization denials logged | Working | No passwords/tokens in log reasons | test_audit_and_integration.py | COMPLETED |
| Frontend bypass prevention | Partial | Frontend hides buttons but API checks enforced | N/A | NEEDS_VERIFICATION |
| Valid token permitted request | Working | Scenario: viewer reads public resource | test_authorization_policy.py | COMPLETED |
| Missing token denied | Working | Scenario: no token returns 401 | test_auth.py | COMPLETED |
| Malformed token denied | Working | Scenario: invalid Bearer format returns 401 | test_auth.py | COMPLETED |
| Expired token denied | Working | Scenario: past expiration returns 401 | test_auth.py | COMPLETED |
| Invalid signature denied | Working | Scenario: wrong secret returns 401 | test_auth.py | COMPLETED |
| Database persistence | Working | SQLite with SQLAlchemy, seeded defaults | test_audit_and_integration.py | COMPLETED |
| Audit log pagination | Partial | Index on created_at, but no limit in query | N/A | NEEDS_VERIFICATION |
| Policy evaluation (device trust) | Working | High sensitivity requires trusted device signal | test_authorization_policy.py | COMPLETED |
| Policy evaluation (MFA) | Working | High sensitivity requires MFA signal | test_authorization_policy.py | COMPLETED |
| Risk threshold enforcement | Working | Score > threshold returns 403 | test_authorization_policy.py | COMPLETED |
| Dashboard metrics endpoint | Working | Returns total/allowed/denied counts | test_audit_and_integration.py | COMPLETED |
| Security test scenarios | Working | 9 predefined scenarios in /security-tests/run | test_audit_and_integration.py | COMPLETED |
| Report generation | Not implemented | Add PDF report generation from persisted data | N/A | NOT_STARTED |
| OpenAPI documentation | Not implemented | Add FastAPI OpenAPI spec | N/A | NOT_STARTED |
| CORS configuration | Missing | Add CORS middleware with restricted origins | N/A | NEEDED |
| Input validation | Partial | Pydantic schemas on request models | N/A | IMPROVEMENT_NEEDED |
| Error handling consistency | Partial | Some endpoints expose raw exceptions | N/A | IMPROVEMENT_NEEDED |
| Docker deployment | Not implemented | Add Dockerfile, docker-compose.yaml | N/A | NOT_STARTED |
| Windows startup script | Not implemented | Add documented Windows startup commands | N/A | NOT_STARTED |
| Windows shutdown script | Not implemented | Add documented Windows shutdown commands | N/A | NOT_STARTED |
| Health checks | Partial | /health endpoint exists, minimal checks | N/A | BASIC |
| Rate limiting | Working | In-memory rate limiter in deps.py | test_auth.py | COMPLETED |
| Token type validation | Working | payload.get("token_type") != "access" check | test_auth.py | COMPLETED |
| Correlation ID propagation | Working | x-correlation-id header in audit logs | test_audit_and_integration.py | COMPLETED |