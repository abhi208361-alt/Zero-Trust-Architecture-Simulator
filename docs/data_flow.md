# Data Flow Diagram - Zero Trust Architecture Simulator

## Authentication Data Flow

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI
    participant DB
    
    Client->>FastAPI: POST /api/v1/auth/login 
        username + password
    FastAPI->>DB: SELECT user BY username
    DB-->>FastAPI: user record
    alt Valid credentials
        FastAPI->>FastAPI: create_access_token(username)
        FastAPI-->>Client: TokenResponse {access_token, expires_at}
        Client->>FastAPI: Subsequent requests
            Authorization: Bearer <token>
        FastAPI->>FastAPI: decode_token(jti, exp, iss, aud)
        alt Token valid
            FastAPI->>FastAPI: get_current_user(username)
            FastAPI->>RBAC: check permissions
            RBAC-->>FastAPI: allow/deny decision
            FastAPI-->>Client: 200 OK / 403 Forbidden
        else Token invalid
            FastAPI-->>Client: 401 Unauthorized
        end
    else Invalid credentials
        FastAPI->>DB: mark_failed_attempt
        FastAPI->>DB: write_audit_log
        FastAPI-->>Client: 401 Unauthorized
        write_audit_log
        result=deny, reason=invalid credentials
    end
```

## Authorization Data Flow

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI
    participant DB
    participant PolicyEngine
    
    Client->>FastAPI: Request with Bearer token
    FastAPI->>DB: get_user BY username from token
    DB-->>FastAPI: User record (role, is_active)
    FastAPI->>PolicyEngine: evaluate_request(
        username, resource, action,
        device_trusted, mfa_passed, risk_score
    )
    PolicyEngine-->>FastAPI: PolicyDecision {decision, reason, checks, risk_score}
    alt Decision=allow
        FastAPI-->>Client: 200 OK + resource data
        FastAPI->>DB: write_audit_log result=allow
    else Decision=deny
        FastAPI-->>Client: 403 Forbidden
            detail={reason, decision, checks}
        FastAPI->>DB: write_audit_log result=deny
    end
```

## Audit Logging Data Flow

```mermaid
sequenceDiagram
    participant FastAPI
    participant DB
    
    FastAPI->>DB: write_audit_log(
        correlation_id, event_type,
        actor_id, actor_username,
        resource, action, result, reason
    )
    DB->>AuditLog table: INSERT record
    DB-->>FastAPI: id of created record
    Note over FastAPI,DB: Indexed on result, actor_id for queries
    FastAPI->>FastAPI: Dashboard endpoints
    query last 10 logs,
    count by result type
```

## Policy Evaluation Data Flow

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI
    participant DB
    participant PolicyEngine
    
    Client->>FastAPI: PolicyEvaluationRequest
    FastAPI->>DB: get_current_user(username)
    DB-->>FastAPI: User record
    FastAPI->>PolicyEngine: evaluate_request(
        ...
        ROLE_PERMISSIONS[user.role][action][resource],
        device_trusted, mfa_passed, risk_score
    )
    PolicyEngine-->>FastAPI: PolicyDecision
    FastAPI->>FastAPI: Construct denial reason string
    FastAPI->>DB: write_audit_log security_testing
    FastAPI-->>Client: PolicyDecision JSON
```

## Summary of Data Flows

| Flow | Components | Key Data Passed | Decision Point |
|------|-----------|----------------|----------------|
| Auth | Client, FastAPI, DB | username, password | Credential verification |
| Authz | FastAPI, DB, PolicyEngine | username, resource, action, device_trusted, mfa_passed, risk_score | Allow/deny per-request |
| Audit | FastAPI, DB | correlation_id, event_type, actor, resource, action, result, reason | Log every operation |
| Policy | FastAPI, DB, PolicyEngine | ROLE_PERMISSIONS, risk_score, device_trusted, mfa_passed | Policy decision per operation |