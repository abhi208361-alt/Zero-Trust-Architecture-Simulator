export type UserRole = 'viewer' | 'analyst' | 'administrator'

export interface UserRecord {
  id: number
  username: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_at: string
}

export interface PolicyConfig {
  risk_threshold: number
  require_trusted_device_for_high_sensitivity: boolean
  require_mfa_for_high_sensitivity: boolean
}

export interface PolicyDecision {
  decision: 'allow' | 'deny'
  reason: string
  checks: string[]
  risk_score: number
  timestamp: string
  correlation_id: string
  user: string
  resource: string
  action: string
}

export interface DashboardMetrics {
  total_access_requests: number
  allowed_requests: number
  denied_requests: number
  denial_percentage: number
  users_total: number
  users_active: number
  role_distribution: Record<string, number>
  recent_events: Array<{
    timestamp: string
    event_type: string
    actor: string | null
    resource: string
    action: string
    result: string
    reason: string
  }>
}

export interface AuditLog {
  id: number
  created_at: string
  correlation_id: string
  event_type: string
  actor_id: number | null
  actor_username: string | null
  resource: string
  action: string
  result: string
  reason: string
  risk_score: number
  metadata_json: string
}

export interface AuditSummary {
  total_events: number
  allowed_events: number
  denied_events: number
  auth_failures: number
}

export interface RbacMatrix {
  role_permissions: Record<string, string[]>
  resource_action_permissions: Record<string, string>
  resource_sensitivity: Record<string, string>
}