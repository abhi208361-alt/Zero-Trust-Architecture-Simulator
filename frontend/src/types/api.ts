/* Type definitions for FastAPI backend responses */
export type User = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export type DashboardMetrics = {
  total_access_requests: number;
  allowed_requests: number;
  denied_requests: number;
  denial_percentage: number;
  users_total: number;
  users_active: number;
  role_distribution: Record<string, number>;
  recent_events: Array<{
    timestamp: string;
    event_type: string;
    actor: string;
    resource: string;
    action: string;
    result: string;
    reason: string;
  }>;
};

export type AuditLog = {
  id: number;
  created_at: string;
  correlation_id: string;
  actor_id: number | null;
  actor_username: string | null;
  resource: string;
  action: string;
  result: string;
  reason: string;
  risk_score: number;
  metadata_json: string;
};

export type AuditSummary = {
  total_events: number;
  allowed_events: number;
  denied_events: number;
  auth_failures: number;
};

export type PolicyConfig = {
  risk_threshold: number;
  require_trusted_device_for_high_sensitivity: boolean;
  require_mfa_for_high_sensitivity: boolean;
};

export type PolicyDecision = {
  decision: 'allow' | 'deny';
  reason: string;
  checks: Array<string>;
  risk_score: number;
  timestamp: string;
  correlation_id: string;
  user: string;
  resource: string;
  action: string;
};

export type SecurityTestResult = {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  reason: string;
  checks: Array<string>;
};