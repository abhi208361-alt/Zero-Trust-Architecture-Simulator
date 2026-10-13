# Test Strategy

## Overview
This document describes the automated test strategy for the Zero Trust Architecture Simulator educational project. The test strategy covers backend, frontend, integration, and end-to-end testing across multiple quality gates.

## Test Pyramid
- **Unit Tests**: ~30 tests covering individual functions, JWT operations, RBAC logic, policy engine, database operations, audit logging
- **Integration Tests**: ~20 tests covering frontend/backend API contracts, backend/MongoDB interaction, token/RBAC flows, Docker service health
- **End-to-End Tests**: ~15 tests covering admin workflow, analyst workflow, viewer workflow, denied operations, token failure scenarios, scenario execution

## Backend Tests (pytest)
### Authentication Tests
- Valid login and me endpoint
- Invalid password denied
- Missing token denied
- Malformed token denied
- Expired token denied
- Invalid signature denied
- Disabled account denied
- Logout revokes token

### RBAC and Policy Tests
- Viewer allowed and denied paths
- Analyst allowed security events
- Unknown resource and default deny
- Untrusted device denied for high sensitivity
- Risk threshold denial
- Unauthorized role change and privilege escalation rejected

### Database Tests
- Database initialization and seeded users
- Audit logging and authorization
- Dashboard and security testing endpoints

## Frontend Tests (Vitest + React Testing Library)
### Login/Logout
- Login form submission with valid/invalid credentials
- Logout clears token and user state

### Role-Specific Navigation
- Viewer can see public resources, denied on admin
- Analyst can view security events, denied on user management
- Viewer/Analyst cannot access admin-only pages

### Permission-Related UI States
- Policy evaluation results displayed correctly based on role
- Loading, error, and success states handled

### Form Validation
- Login form validation
- Policy evaluation form validation
- Risk score input validation

## Integration Tests
### Frontend/Backend API Contracts
- API client in frontend matches backend endpoints
- Request/response formats compatible
- Authentication flow works end-to-end

### Backend/MongoDB Interaction
- Database persistence tests with isolated DB
- Seed data consistency
- Audit log queries work correctly

### Token/RBAC Flows
- Token creation -> validation -> RBAC check -> access decision
- Revoked token behavior
- Role-based access enforcement

### Docker Service Startup and Health
- Docker Compose starts frontend, backend, MongoDB
- Health checks pass after service startup
- Clean shutdown and restart

### Report Generation from Persisted Data
- Generate PDF report from audit logs
- Report includes correct sections and data
## End-to-End Tests
### Admin Workflow
- Login as admin
- Manage users and roles
- Configure policy settings
- Run security scenarios
- Generate and download reports

### Analyst Workflow
- Login as analyst
- View security events and audit logs
- Investigate scenarios
- Generate reports

### Viewer Workflow
- Login as viewer
- View permitted resources only
- Run allowed scenarios
- Cannot administer users or change roles

### Denied Privileged Operation
- Viewer attempts admin operation
- Proper 403 response received
- Audit log records denial

### Token Failure Scenarios
- Missing token -> 401
- Expired token -> 401
- Invalid token -> 401
- Revoked token -> 401

### Educational Scenario Execution
- Valid token -> access allowed
- Missing token -> access denied
- Malformed token -> access denied
- Expired token -> access denied
- Invalid signature -> access denied
- Revoked token -> access denied
- Viewer attempting admin -> denied
- Analyst attempting user management -> denied
- Unauthorized resource access -> denied
- Role escalation attempt -> denied
- Disabled account -> denied
- Invalid authorization policy -> denied