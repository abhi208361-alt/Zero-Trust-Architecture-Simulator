import type {
  AuditLog,
  AuditSummary,
  DashboardMetrics,
  PolicyConfig,
  PolicyDecision,
  RbacMatrix,
  TokenResponse,
  UserRecord,
} from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1'

async function request<T>(path: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const detail =
      typeof body?.detail === 'string'
        ? body.detail
        : body?.detail
          ? JSON.stringify(body.detail)
          : `Request failed: ${response.status}`
    throw new Error(detail)
  }

  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

export const api = {
  login: async (username: string, password: string): Promise<TokenResponse> =>
    request<TokenResponse>('/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getCurrentUser: async (token: string): Promise<UserRecord> => request<UserRecord>('/auth/me', token),

  getDashboardMetrics: async (token: string): Promise<DashboardMetrics> => request<DashboardMetrics>('/dashboard/metrics', token),

  getUsers: async (token: string): Promise<UserRecord[]> => request<UserRecord[]>('/users', token),

  getAuditLogs: async (token: string, params?: Record<string, string | number | undefined>): Promise<AuditLog[]> => {
    const query = new URLSearchParams()
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
    })
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<AuditLog[]>(`/audit/logs${suffix}`, token)
  },

  getAuditSummary: async (token: string): Promise<AuditSummary> => request<AuditSummary>('/audit/summary', token),

  getPolicyConfig: async (token: string): Promise<PolicyConfig> => request<PolicyConfig>('/policy/config', token),

  updatePolicyConfig: async (
    token: string,
    payload: PolicyConfig,
  ): Promise<{
    message: string
    risk_threshold: number
    require_trusted_device_for_high_sensitivity: boolean
    require_mfa_for_high_sensitivity: boolean
  }> =>
    request<{
      message: string
      risk_threshold: number
      require_trusted_device_for_high_sensitivity: boolean
      require_mfa_for_high_sensitivity: boolean
    }>('/policy/config', token, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  evaluateAccess: async (
    token: string,
    payload: {
      username: string
      resource: string
      action: string
      simulated_device_trusted: boolean
      simulated_mfa_passed: boolean
      simulated_risk_score: number
    },
  ): Promise<PolicyDecision> =>
    request<PolicyDecision>('/policy/evaluate', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRbacMatrix: async (token: string): Promise<RbacMatrix> => request<RbacMatrix>('/rbac/matrix', token),

  getSecurityTests: async (
    token: string,
  ): Promise<{
    executed_at: string
    results: Array<{
      name: string
      expected: string
      actual: string
      passed: boolean
      reason: string
      checks: string[]
    }>
  }> =>
    request<{
      executed_at: string
      results: Array<{
        name: string
        expected: string
        actual: string
        passed: boolean
        reason: string
        checks: string[]
      }>
    }>('/security-tests/run', token),

  getResources: async (token: string): Promise<{ resources: Record<string, string> }> =>
    request<{ resources: Record<string, string> }>('/resources', token),

  logout: async (token: string): Promise<{ message: string }> =>
    request<{ message: string }>('/auth/logout', token, { method: 'POST' }),
}

export { API_BASE }