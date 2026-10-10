# Zero Trust Architecture Simulator (Educational)

## Milestone 1: Scope, Lab Setup and Implementation Plan

## 1. Project Overview

The **Zero Trust Architecture Simulator** is an educational cybersecurity project designed to demonstrate the principles of Zero Trust security, least-privilege access, token-based authentication, Identity and Access Management (IAM), and Role-Based Access Control (RBAC).

The project will simulate how an application verifies a user's identity, checks their permissions, evaluates access policies, and allows or denies requests to protected resources.

The application will be developed and tested in a controlled local environment using synthetic users and test data.

## 2. Project Objectives

- Demonstrate the Zero Trust security model.
- Implement token-based authentication.
- Apply IAM concepts and RBAC.
- Enforce least-privilege access.
- Deny unauthorized requests by default.
- Record access decisions using audit logs.
- Test security controls and document findings.
- Recommend security improvements based on test results.

## 3. Project Scope

### In Scope

- Local educational microservice application.
- Authentication using signed, expiring tokens.
- Demo user identities and role management.
- Role-based permission checks.
- Access-policy enforcement.
- Audit logging for allowed and denied requests.
- Automated security tests.
- Documentation and a final security assessment report.

### Out of Scope

- Testing third-party systems without explicit authorization.
- Attacking public websites, networks, or APIs.
- Collecting real users' credentials or sensitive information.
- Production deployment as an enterprise IAM solution.
- Claiming that simulated device-trust checks provide real device security.

## 4. Rules of Engagement and Authorization

All testing will be restricted to systems owned by me or explicitly authorized for testing.

The initial development environment will run locally on my Windows computer. Testing will use synthetic accounts, sample requests, and non-sensitive data.

The following rules will be followed:

1. Test only within the approved project scope.
2. Do not scan or attack public systems.
3. Do not use real credentials or sensitive personal data.
4. Do not commit API keys, passwords, signing secrets, or `.env` files to GitHub.
5. Use default-deny access policies for protected resources.
6. Stop testing if an unexpected external system or real sensitive data is encountered.
7. Record test results and security findings accurately.

## 5. Lab Environment Setup

### Hardware

- Personal computer or laptop.
- Internet connection for downloading development tools and dependencies.

### Software

| Component           | Technology               |
| ------------------- | ------------------------ |
| Operating system    | Windows 11               |
| Code editor         | Visual Studio Code       |
| AI coding assistant | Cline                    |
| AI model            | Available Nemotron model |
| Backend             | Python and FastAPI       |
| API server          | Uvicorn                  |
| Frontend            | React and Vite (planned) |
| Database            | SQLite (planned)         |
| Testing             | Pytest                   |
| Version control     | Git and GitHub           |

A virtual machine is optional for this initial localhost-only project. The application will bind to `127.0.0.1` during development to avoid exposing it to the public internet.

**Note:** The software listed above represents the planned environment. Installed versions and completed setup steps will be verified during implementation.

## 6. Proposed System Architecture

The simulator will use the following request flow:

1. A user submits a request to the application.
2. The authentication component validates the supplied token.
3. The identity and role information is retrieved or verified.
4. The policy engine checks whether the requested action is permitted.
5. The application allows or denies access.
6. The audit component records the decision without storing passwords, signing secrets, or complete access tokens.

### Main Components

- **Authentication Service:** Verifies user identity and tokens.
- **IAM and RBAC Module:** Manages demo users, roles, and permissions.
- **Policy Engine:** Evaluates access requests.
- **Protected Resources:** Demonstrates access to restricted endpoints.
- **Audit Logger:** Records access decisions and relevant security events.
- **Dashboard:** Displays users, policies, and access events (planned).

## 7. Proposed User Roles

| Role          | Example Permissions                              |
| ------------- | ------------------------------------------------ |
| Viewer        | Read permitted status and summary information.   |
| Analyst       | Read permitted events and create analysis notes. |
| Administrator | Manage demo roles and policy configuration.      |

Each role will receive only the permissions required for its intended tasks. Administrative actions will also require successful authentication and authorization.

## 8. Implementation Plan

### Phase 1: Scope and Planning

- Define objectives and project boundaries.
- Document authorized testing rules.
- Identify the lab environment and development tools.
- Design the initial architecture and test plan.

### Phase 2: Backend Development

- Create the FastAPI application.
- Add basic service endpoints.
- Configure the local development environment.
- Create automated tests.

### Phase 3: Authentication and Access Control

- Implement password hashing and login.
- Add signed, expiring tokens.
- Implement IAM and RBAC.
- Enforce least-privilege and default-deny policies.

### Phase 4: Logging and Dashboard

- Record allowed and denied access decisions.
- Build a dashboard to display audit events and policy decisions.
- Add input validation and error handling.

### Phase 5: Security Testing

- Test requests without tokens.
- Test invalid and expired tokens.
- Test access with insufficient permissions.
- Verify that unauthorized administrative actions are denied.
- Verify audit-log completeness and secret handling.

### Phase 6: Reporting and Submission

- Document the test methodology.
- Record findings and supporting evidence.
- Assess risks and recommend fixes.
- Prepare the final report in PDF format.
- Publish the source code and setup instructions on GitHub.

## 9. Initial Security Test Plan

| Test Case                                                | Expected Result                      |
| -------------------------------------------------------- | ------------------------------------ |
| Valid token with permitted role                          | Access allowed                       |
| Missing token                                            | Access denied                        |
| Invalid token                                            | Access denied                        |
| Expired token                                            | Access denied                        |
| Viewer attempts an administrative action                 | Access denied                        |
| Unknown role or missing permission                       | Access denied                        |
| Access decision occurs                                   | Appropriate audit event recorded     |
| User attempts to alter their own role to gain privileges | No unauthorized privilege escalation |

These are planned test cases. Results will be recorded only after the tests have actually been performed.

## 10. Risks and Mitigation

| Risk                                                 | Mitigation                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Incorrect AI-generated code                          | Review code, run tests, and validate negative cases.                          |
| Exposed credentials or signing secrets               | Use environment variables and `.gitignore`; review commits before publishing. |
| Excessive user permissions                           | Use least privilege, explicit permissions, and default-deny rules.            |
| Incomplete audit logs                                | Test both allowed and denied requests.                                        |
| Unauthorized testing outside scope                   | Keep testing within the approved local environment.                           |
| Confusion between simulation and production security | Clearly document the educational limitations of the project.                  |

## 11. Milestone Deliverables

### Milestone 1: Scope, Lab Setup and Plan

- Project scope and objectives.
- Authorization and testing rules.
- Planned lab setup and tools.
- Proposed architecture.
- Implementation schedule.
- Initial security test plan.

### Milestone 2: Testing, Findings and Report

- Implemented project source code.
- GitHub repository and setup instructions.
- Test scripts and actual test results.
- Evidence of allowed and denied access decisions.
- Findings, risk ratings, and recommended fixes.
- Final security assessment report in PDF format.

## 12. Completion Criteria

The project will be considered complete when the application demonstrates token validation, role-based access control, least-privilege enforcement, default-deny behavior, and reliable audit logging. Automated tests will verify permitted and prohibited actions, and the final report will explain the findings and limitations in clear language.

## 13. Conclusion

This milestone establishes the scope, safety boundaries, lab setup, architecture, and implementation plan for the Zero Trust Architecture Simulator. The next milestone will focus on implementing the planned controls, testing their effectiveness, analysing findings, and recommending security improvements.

The project is intended for educational purposes and does not claim to replace a production-grade Zero Trust or IAM platform.

---

**Project:** Zero Trust Architecture Simulator (Educational)
**Milestone:** 1 — Scope, Lab Setup and Plan
**Student Name:** [Abhilash.B]
**Date:** 10-10-2026
