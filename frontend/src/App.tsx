import { FormEvent, useEffect, useMemo, useState } from 'react'
import './App.css'

type User = { id: number; username: string; email: string; full_name: string; role: string; is_active: boolean }
type Metrics = {
  total_access_requests: number
  allowed_requests: number
  denied_requests: number
  denial_percentage: number
  users_total: number
  users_active: number
  role_distribution: Record<string, number>
  recent_events: Array<Record<string, string>>
}

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1'

function App() {
  const [token, setToken] = useState('')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123!')
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [audit, setAudit] = useState<Array<Record<string, unknown>>>([])
  const [policy, setPolicy] = useState({ risk_threshold: 70, require_trusted_device_for_high_sensitivity: true, require_mfa_for_high_sensitivity: false })
  const [simDecision, setSimDecision] = useState<Record<string, unknown> | null>(null)
  const [securityResults, setSecurityResults] = useState<Array<Record<string, unknown>>>([])

  const authHeaders = useMemo(() => (token ? { Authorization: 'Bearer '.concat(token) } : {}), [token])

  const request = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers ?? {}),
      },
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.detail ? JSON.stringify(body.detail) : `Request failed: ${response.status}`)
    }
    return response.json()
  }

  const loadProtectedData = async () => {
    if (!token) return
    try {
      setError('')
      const [me, m, usersData, logs, policyData] = await Promise.all([
        request('/auth/me'),
        request('/dashboard/metrics'),
        request('/users').catch(() => []),
        request('/audit/logs').catch(() => []),
        request('/policy/config'),
      ])
      setCurrentUser(me)
      setMetrics(m)
      setUsers(usersData)
      setAudit(logs)
      setPolicy(policyData)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => {
    loadProtectedData()
  }, [token])

  const login = async (event: FormEvent) => {
    event.preventDefault()
    try {
      setError('')
      const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      setToken(data.access_token)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const logout = async () => {
    try {
      await request('/auth/logout', { method: 'POST' })
    } catch {
      // ignore error on logout cleanup
    }
    setToken('')
    setCurrentUser(null)
    setMetrics(null)
    setUsers([])
    setAudit([])
    setSecurityResults([])
    setSimDecision(null)
  }

  const runSimulator = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const data = await request('/policy/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          username: form.get('simUser'),
          resource: form.get('resource'),
          action: form.get('action'),
          simulated_device_trusted: form.get('trusted') === 'on',
          simulated_mfa_passed: form.get('mfa') === 'on',
          simulated_risk_score: Number(form.get('risk') ?? 0),
        }),
      })
      setSimDecision(data)
      loadProtectedData()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const savePolicy = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await request('/policy/config', { method: 'PUT', body: JSON.stringify(policy) })
      loadProtectedData()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const runSecurityTests = async () => {
    try {
      const data = await request('/security-tests/run')
      setSecurityResults(data.results)
      loadProtectedData()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <main className="app-shell">
      <header>
        <h1>Zero Trust Architecture Simulator</h1>
        <p>Educational security console with real backend policy decisions</p>
      </header>

      {!token ? (
        <section className="panel">
          <h2>Login</h2>
          <form onSubmit={login} className="grid">
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" aria-label="Username" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" aria-label="Password" />
            <button type="submit">Sign in</button>
          </form>
          <p className="muted">Demo users: viewer/viewer123!, analyst/analyst123!, admin/admin123!</p>
        </section>
      ) : (
        <>
          <section className="panel split">
            <div>
              <h2>Session</h2>
              <p>{currentUser ? `${currentUser.username} (${currentUser.role})` : 'Loading...'}</p>
            </div>
            <button onClick={logout}>Logout</button>
          </section>

          <section className="panel">
            <h2>Overview</h2>
            {!metrics ? <p>Loading metrics...</p> : <div className="grid stats">
              <div>Total requests: {metrics.total_access_requests}</div>
              <div>Allowed: {metrics.allowed_requests}</div>
              <div>Denied: {metrics.denied_requests}</div>
              <div>Denial %: {metrics.denial_percentage}</div>
              <div>Users: {metrics.users_total}</div>
              <div>Active users: {metrics.users_active}</div>
            </div>}
          </section>

          <section className="panel">
            <h2>RBAC and Resources</h2>
            <p>Viewer: summaries/public read. Analyst: security events + audit read. Administrator: user/policy management.</p>
          </section>

          <section className="panel">
            <h2>Zero Trust Simulator</h2>
            <form onSubmit={runSimulator} className="grid">
              <input name="simUser" defaultValue={currentUser?.username ?? 'viewer'} placeholder="username" />
              <select name="resource" defaultValue="resources/public">
                <option>resources/public</option>
                <option>resources/security-events</option>
                <option>resources/admin</option>
                <option>policy</option>
              </select>
              <select name="action" defaultValue="read">
                <option>read</option>
                <option>manage</option>
              </select>
              <label><input name="trusted" type="checkbox" defaultChecked /> Simulated trusted device</label>
              <label><input name="mfa" type="checkbox" /> Simulated MFA passed</label>
              <label>Risk score <input name="risk" type="number" min={0} max={100} defaultValue={5} /></label>
              <button type="submit">Evaluate Policy</button>
            </form>
            {simDecision ? <pre>{JSON.stringify(simDecision, null, 2)}</pre> : <p className="muted">Run a simulation to view structured decision output.</p>}
          </section>

          <section className="panel">
            <h2>Identity and Users</h2>
            {users.length === 0 ? <p>No access or no users to display.</p> : (
              <table>
                <thead><tr><th>User</th><th>Role</th><th>Active</th></tr></thead>
                <tbody>
                  {users.map((u) => <tr key={u.id}><td>{u.username}</td><td>{u.role}</td><td>{String(u.is_active)}</td></tr>)}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel">
            <h2>Audit Logs</h2>
            {audit.length === 0 ? <p>No logs loaded.</p> : (
              <table>
                <thead><tr><th>Event</th><th>Actor</th><th>Resource</th><th>Result</th><th>Reason</th></tr></thead>
                <tbody>
                  {audit.map((log, idx) => (
                    <tr key={idx}>
                      <td>{String(log.event_type)}</td>
                      <td>{String(log.actor_username ?? '-')}</td>
                      <td>{String(log.resource)}</td>
                      <td>{String(log.result)}</td>
                      <td>{String(log.reason)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel">
            <h2>Policy Management (Admin)</h2>
            <form onSubmit={savePolicy} className="grid">
              <label>Risk threshold
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={policy.risk_threshold}
                  onChange={(e) => setPolicy({ ...policy, risk_threshold: Number(e.target.value) })}
                />
              </label>
              <label><input type="checkbox" checked={policy.require_trusted_device_for_high_sensitivity} onChange={(e) => setPolicy({ ...policy, require_trusted_device_for_high_sensitivity: e.target.checked })} /> Require trusted device for high sensitivity</label>
              <label><input type="checkbox" checked={policy.require_mfa_for_high_sensitivity} onChange={(e) => setPolicy({ ...policy, require_mfa_for_high_sensitivity: e.target.checked })} /> Require MFA for high sensitivity</label>
              <button type="submit">Save policy</button>
            </form>
          </section>

          <section className="panel">
            <h2>Security Testing</h2>
            <button onClick={runSecurityTests}>Run predefined scenarios</button>
            {securityResults.length === 0 ? <p className="muted">No scenarios executed yet.</p> : <pre>{JSON.stringify(securityResults, null, 2)}</pre>}
          </section>
        </>
      )}

      {error ? <p className="error">{error}</p> : null}
    </main>
  )
}

export default App
