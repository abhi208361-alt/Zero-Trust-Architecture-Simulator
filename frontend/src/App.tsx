import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'

type User = {
  id: number
  username: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  theme?: string
  timezone?: string
  notification_preferences?: string
}

type PolicyConfig = {
  risk_threshold: number
  require_trusted_device_for_high_sensitivity: boolean
  require_mfa_for_high_sensitivity: boolean
}

type PolicyRule = {
  id: number
  name: string
  tenant: string
  description: string
  effect: 'allow' | 'deny'
  priority: number
  identities: string[]
  resources: string[]
  actions: string[]
  conditions: string[]
  enabled: boolean
}

type AuthResponse = {
  access_token: string
  token_type: string
  expires_at: string | null
}

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1'

const STORAGE_TOKEN = 'zta_token'
const STORAGE_USER = 'zta_user'

const navItems = [
  { label: 'Overview Dashboard', path: '/dashboard' },
  { label: 'Access Simulator', path: '/access-simulator' },
  { label: 'Users & Roles', path: '/users' },
  { label: 'Policy Management', path: '/policies' },
  { label: 'Audit Logs', path: '/audit-logs' },
  { label: 'Network Map', path: '/network-map' },
  { label: 'Reports', path: '/reports' },
  { label: 'Risk Analysis', path: '/risk-analysis' },
  { label: 'Security Testing', path: '/security-testing' },
  { label: 'Security Investigations', path: '/investigations' },
  { label: 'AI Assistant', path: '/assistant' },
  { label: 'Documentation', path: '/documentation' },
  { label: 'Settings', path: '/settings' },
]

function getStoredToken() {
  return localStorage.getItem(STORAGE_TOKEN) ?? ''
}

function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_USER)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function resolveTheme(theme: string) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return theme === 'light' || theme === 'ocean' ? theme : 'dark'
}

function applyTheme(theme: string, color = localStorage.getItem('zt-color') ?? 'blue') {
  document.documentElement.dataset.theme = resolveTheme(theme)
  document.documentElement.dataset.color = color
}

function App() {
  const [token, setToken] = useState<string>(() => getStoredToken())
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser())
  const [loadingUser, setLoadingUser] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const storedTheme = localStorage.getItem('zt-theme') ?? currentUser?.theme ?? 'system'
    applyTheme(storedTheme)
    if (storedTheme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    const handleChange = () => applyTheme('system')
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [currentUser?.theme])

  useEffect(() => {
    if (token) {
      localStorage.setItem(STORAGE_TOKEN, token)
    } else {
      localStorage.removeItem(STORAGE_TOKEN)
    }
  }, [token])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(currentUser))
    } else {
      localStorage.removeItem(STORAGE_USER)
    }
  }, [currentUser])

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        setLoadingUser(true)
        const result = await apiFetch('/auth/me', { method: 'GET' }, token)
        setCurrentUser(result)
      } catch {
        setCurrentUser(null)
        setToken('')
      } finally {
        setLoadingUser(false)
      }
    })()
  }, [token])

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' }, token)
    } catch {
      // ignore
    }
    setToken('')
    setCurrentUser(null)
    setError('')
  }

  const authContext = useMemo(
    () => ({
      token,
      currentUser,
      setToken,
      setCurrentUser,
      logout,
      error,
      setError,
    }),
    [token, currentUser, error],
  )

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage setToken={setToken} setCurrentUser={setCurrentUser} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedLayout
              token={token}
              currentUser={currentUser}
              logout={logout}
              authContext={authContext}
            />
          }
        >
          <Route path="dashboard" element={<DashboardPage token={token} currentUser={currentUser} />} />
          <Route path="access-simulator" element={<AccessSimulatorPage token={token} currentUser={currentUser} />} />
          <Route path="users" element={<UsersPage token={token} currentUser={currentUser} />} />
          <Route path="policies" element={<PoliciesPage token={token} currentUser={currentUser} />} />
          <Route path="audit-logs" element={<AuditLogsPage token={token} currentUser={currentUser} />} />
          <Route path="network-map" element={<NetworkMapPage token={token} currentUser={currentUser} />} />
          <Route path="reports" element={<ReportsPage token={token} currentUser={currentUser} />} />
          <Route path="risk-analysis" element={<RiskAnalysisPage token={token} currentUser={currentUser} />} />
          <Route path="security-testing" element={<SecurityTestingPage token={token} currentUser={currentUser} />} />
          <Route path="investigations" element={<InvestigationsPage token={token} currentUser={currentUser} />} />
          <Route path="assistant" element={<AssistantPage token={token} currentUser={currentUser} />} />
          <Route path="documentation" element={<DocumentationPage token={token} currentUser={currentUser} />} />
          <Route path="settings" element={<SettingsPage token={token} currentUser={currentUser} />} />
          <Route path="access-denied" element={<AccessDeniedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  )
}

function ProtectedLayout({
  token,
  currentUser,
  logout,
  authContext,
}: {
  token: string
  currentUser: User | null
  logout: () => Promise<void>
  authContext: any
}) {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
    }
  }, [token, navigate])

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="layout-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-name">Zero Trust</div>
            <div className="brand-sub">Architecture Simulator</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-dot" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <div className="session-label">Session</div>
          <div className="session-user">
            {currentUser ? `${currentUser.username} • ${currentUser.role}` : 'Unknown'}
          </div>
          <button className="primary-button small" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <div className="eyebrow">Zero Trust + Policy Intelligence</div>
            <h1>{routeTitle(location.pathname)}</h1>
          </div>
          <div className="top-actions">
            <button type="button" className="ghost-button">
              Refresh
            </button>
            <button type="button" className="primary-button">
              Export
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  )
}

function routeTitle(path: string) {
  const map: Record<string, string> = {
    '/dashboard': 'Overview Dashboard',
    '/access-simulator': 'Access Request Simulator',
    '/users': 'Users & Roles',
    '/policies': 'Policy Management',
    '/audit-logs': 'Audit Logs',
    '/network-map': 'Network Map',
    '/reports': 'Reports',
    '/risk-analysis': 'Risk Analysis',
    '/security-testing': 'Security Testing',
    '/investigations': 'Security Investigations',
    '/assistant': 'AI Assistant',
    '/documentation': 'Documentation',
    '/settings': 'Settings',
    '/access-denied': 'Access Denied',
  }

  return map[path] ?? 'Overview'
}

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing-page">
      <div className="landing-card">
        <div className="landing-header">
          <div className="brand-badge">Z</div>
          <div>
            <div className="kicker">Zero Trust</div>
            <div className="sub-kicker">Architecture Simulator</div>
          </div>
        </div>

        <div className="landing-main">
          <div className="landing-copy">
            <div className="eyebrow amid">Zero Trust + Policy Intelligence</div>
            <h1>Zero Trust Architecture Simulator</h1>
            <p>
              Build, test, and validate access control policy decisions with enterprise-grade
              authentication, policy evaluation, and audit visibility.
            </p>

            <div className="landing-actions">
              <button className="primary-button" onClick={() => navigate('/register')}>
                Get Started
              </button>
              <button className="ghost-button" onClick={() => navigate('/login')}>
                Learn More
              </button>
            </div>

            <div className="feature-grid">
              <div className="feature-box">
                <div className="feature-title">Identity & Access Management</div>
                <div className="feature-copy">Validate user identity, role and device trust.</div>
              </div>
              <div className="feature-box">
                <div className="feature-title">Policy Evaluation</div>
                <div className="feature-copy">Model zero-trust decisions using real policy logic.</div>
              </div>
              <div className="feature-box">
                <div className="feature-title">Real-Time Audit Monitoring</div>
                <div className="feature-copy">Review persisted decisions and protected audit logs.</div>
              </div>
              <div className="feature-box">
                <div className="feature-title">Risk Analysis & Security Testing</div>
                <div className="feature-copy">Assess posture using real simulated and evaluated data.</div>
              </div>
            </div>
          </div>

          <div className="landing-panel">
            <div className="shield">
              <div className="shield-inner">🔒</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginPage({
  setToken,
  setCurrentUser,
}: {
  setToken: (v: string) => void
  setCurrentUser: (v: User | null) => void
}) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const doLogin = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await apiFetch<AuthResponse>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            username,
            password,
          }),
        },
        '',
      )

      setToken(result.access_token)
      const me = await apiFetch<User>('/auth/me', {
        method: 'GET',
      }, result.access_token)

      setCurrentUser(me)
      navigate('/dashboard')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-name">Zero Trust</div>
            <div className="brand-sub">Architecture Simulator</div>
          </div>
        </div>

        <form className="auth-form" onSubmit={doLogin}>
          <h2>Sign In</h2>
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            Password
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="toggle-password">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error && <div className="error-banner">{error}</div>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="auth-meta">
            <span>Need an account?</span>
            <button type="button" className="link-button" onClick={() => navigate('/register')}>
              Create account
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    confirm_password: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const doRegister = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        username: form.username,
        password: form.password,
        role: 'viewer',
      }

      if (form.password !== form.confirm_password) {
        throw new Error('Passwords do not match.')
      }

      const result = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, '')

      if (!result || result.error) {
        throw new Error(result?.detail ?? 'Registration failed.')
      }

      setSuccess('Account created successfully.')
      setTimeout(() => navigate('/login'), 1000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-name">Zero Trust</div>
            <div className="brand-sub">Architecture Simulator</div>
          </div>
        </div>

        <form className="auth-form" onSubmit={doRegister}>
          <h2>Create Account</h2>

          <label>
            Full Name
            <input value={form.full_name} onChange={onChange('full_name')} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={onChange('email')} />
          </label>
          <label>
            Username
            <input value={form.username} onChange={onChange('username')} />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={onChange('password')} />
          </label>
          <label>
            Confirm Password
            <input type="password" value={form.confirm_password} onChange={onChange('confirm_password')} />
          </label>

          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="auth-meta">
            <span>Already have an account?</span>
            <button type="button" className="link-button" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DashboardPage({ token, currentUser }: { token: string; currentUser: User | null }) {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      setMetrics(await apiFetch('/dashboard/metrics', { method: 'GET' }, token))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token])

  if (loading && !metrics) return <div className="dashboard-loading">Loading security overview…</div>
  if (error && !metrics) return <div className="dashboard-error"><strong>Dashboard unavailable</strong><span>{error}</span><button className="primary-button small" onClick={load}>Retry</button></div>

  const total = metrics?.total_access_requests ?? 0
  const denied = metrics?.denied_requests ?? 0
  const allowed = metrics?.allowed_requests ?? 0
  const health = total ? Math.round((allowed / total) * 1000) / 10 : 100
  const events = metrics?.recent_events ?? []
  const time = (value: string) => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  const date = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
  const eventClass = (result: string) => result === 'deny' ? 'is-danger' : result === 'allow' ? 'is-success' : 'is-info'

  return (
    <div className="soc-dashboard">
      <section className="dashboard-heading">
        <div><h2>SOC Dashboard</h2><p>Real-Time Security Overview</p></div>
        <div className="dashboard-heading-actions"><button className="dashboard-refresh" onClick={load} disabled={loading}>↻ {loading ? 'Updating' : 'Refresh'}</button><span className="operational-pill"><i /> Operational</span></div>
      </section>

      <section className="dashboard-stat-grid">
        <article className="dashboard-stat threat"><span className="stat-icon">!</span><div><small>Total Threats</small><strong>{denied.toLocaleString()}</strong><em>↑ {metrics?.denial_percentage?.toFixed(0) ?? 0}%</em></div><span className="mini-sparkline" /></article>
        <article className="dashboard-stat warning"><span className="stat-icon">▲</span><div><small>Active Threats</small><strong>{denied.toLocaleString()}</strong><em>↑ {Math.min(99, Math.max(1, Math.round(metrics?.denial_percentage ?? 0)))}%</em></div><span className="mini-sparkline" /></article>
        <article className="dashboard-stat healthy"><span className="stat-icon">♥</span><div><small>System Health</small><strong>{health}%</strong><em>↑ {health >= 95 ? 2 : 1}%</em></div><span className="mini-sparkline" /></article>
        <article className="dashboard-stat users"><span className="stat-icon">●</span><div><small>Total Users</small><strong>{(metrics?.users_total ?? 0).toLocaleString()}</strong><em>↑ {metrics?.users_active ?? 0}</em></div><span className="mini-sparkline" /></article>
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-card activity-card">
          <div className="dashboard-card-heading"><h3>⌁ &nbsp;Threat Activity</h3><div className="range-tabs"><button className="active">24h</button><button>7d</button><button>30d</button></div></div>
          <div className="activity-legend"><span className="detected">● Detected</span><span className="blocked">● Blocked</span></div>
          <div className="activity-chart">
            <div className="chart-y"><span>150</span><span>100</span><span>50</span><span>0</span></div>
            <svg viewBox="0 0 640 160" preserveAspectRatio="none" aria-label="Threat activity chart">
              <path className="chart-grid-line" d="M0 10H640M0 57H640M0 105H640M0 153H640M0 10V153M106 10V153M213 10V153M320 10V153M426 10V153M533 10V153M640 10V153" />
              <path className="activity-line detected-line" d="M0 64 L53 83 L106 95 L160 72 L213 41 L266 52 L320 34 L373 53 L426 22 L480 40 L533 66 L586 29 L640 16" />
              <path className="activity-line blocked-line" d="M0 88 L53 105 L106 113 L160 94 L213 72 L266 81 L320 66 L373 80 L426 63 L480 76 L533 98 L586 71 L640 63" />
            </svg>
            <div className="chart-x"><span>12AM</span><span>4AM</span><span>8AM</span><span>12PM</span><span>4PM</span><span>8PM</span><span>12AM</span></div>
          </div>
        </article>

        <article className="dashboard-card map-card">
          <div className="dashboard-card-heading"><h3>⊕ &nbsp;Threat Map</h3><button className="card-link" onClick={() => navigate('/network-map')}>View map →</button></div>
          <div className="threat-map"><div className="map-land">◢ ◣ ◥ ◤</div><i className="map-point p1" /><i className="map-point p2" /><i className="map-point p3" /><i className="map-point p4" /><i className="map-point p5" /><i className="map-point p6" /></div>
          <div className="map-legend"><span className="critical">● Critical <b>{denied}</b></span><span className="high">● High <b>{Math.round(denied * .7)}</b></span><span className="medium">● Medium <b>{Math.round(total * .1)}</b></span><span className="low">● Low <b>{allowed}</b></span></div>
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="dashboard-card events-card">
          <div className="dashboard-card-heading"><h3>☷ &nbsp;Recent Security Events</h3><button className="card-link" onClick={() => navigate('/audit-logs')}>View All →</button></div>
          <div className="event-table">
            <div className="event-row event-head"><span>Time</span><span>Event</span><span>User</span><span>Result</span></div>
            {events.slice(0, 5).map((event: any, index: number) => <div className="event-row" key={`${event.timestamp}-${index}`}><span>{time(event.timestamp)}</span><span><b className={`event-dot ${eventClass(event.result)}`} />{event.event_type.replaceAll('_', ' ')}</span><span>{event.actor ?? 'system'}</span><span className={`result-pill ${eventClass(event.result)}`}>{event.result}</span></div>)}
            {!events.length && <div className="empty-dashboard-row">No recent security events.</div>}
          </div>
        </article>

        <article className="dashboard-card risk-card">
          <div className="dashboard-card-heading"><h3>▣ &nbsp;Risk Overview</h3><button className="card-link" onClick={() => navigate('/risk-analysis')}>Details →</button></div>
          <div className="risk-gauge"><div><strong>{Math.round(100 - health)}</strong><small>High Risk</small></div></div>
          <div className="risk-factors"><span>▲ Multiple failed logins</span><span>▲ Suspicious location</span><span>▲ Unusual access pattern</span></div>
          <button className="risk-action" onClick={() => navigate('/assistant')}>✦ &nbsp;Consider reviewing recent access attempts.</button>
        </article>

        <article className="dashboard-card access-card">
          <div className="dashboard-card-heading"><h3>⌁ &nbsp;Recent Access Activity</h3><button className="card-link" onClick={() => navigate('/audit-logs')}>View All →</button></div>
          <div className="access-list">{events.slice(0, 5).map((event: any, index: number) => <button className="access-row" key={`${event.timestamp}-access-${index}`} onClick={() => navigate('/audit-logs')}><span className={`access-avatar ${eventClass(event.result)}`}>{(event.actor ?? 'S')[0].toUpperCase()}</span><span><b>{event.actor ?? 'System'} accessed {event.resource}</b><small>{date(event.timestamp)} · {event.action}</small></span><em>{event.result}</em></button>)}</div>
        </article>
      </section>
      {error && <div className="dashboard-inline-error">{error}</div>}
      <small className="dashboard-session">Signed in as {currentUser?.username ?? 'user'} · {metrics?.users_active ?? 0} active identities monitored</small>
    </div>
  )
}

function AccessSimulatorPage({ token, currentUser }: { token: string; currentUser: User | null }) {
  const [form, setForm] = useState({
    username: currentUser?.username ?? '',
    device_type: 'Laptop',
    security_posture: true,
    resource: 'resources/sensitive',
    location: 'Bengaluru, India',
    auth_status: true,
    action: 'read',
    simulated_device_trusted: true,
    simulated_mfa_passed: true,
    simulated_risk_score: 12,
  })
  const [decision, setDecision] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const execute = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await apiFetch('/policy/evaluate', {
        method: 'POST',
        body: JSON.stringify(form),
      }, token)

      setDecision(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const decisionAllowed = decision?.decision === 'allow'
  const decisionLabel = decision?.decision === 'allow' ? 'ACCESS GRANTED' : decision?.decision === 'deny' ? 'ACCESS DENIED' : 'ADDITIONAL VERIFICATION REQUIRED'
  const risk = decision?.risk_score ?? form.simulated_risk_score
  const riskLabel = risk <= 30 ? 'Low Risk' : risk <= 70 ? 'Medium Risk' : 'High Risk'
  const setField = (key: string, value: string | boolean | number) => setForm((current) => ({ ...current, [key]: value }))
  const timestamp = decision?.timestamp ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(decision.timestamp)) : 'No decision yet'

  useEffect(() => {
    if (currentUser?.username && form.username !== currentUser.username) {
      setForm((current) => ({ ...current, username: currentUser.username }))
    }
  }, [currentUser?.username, form.username])

  return (
    <div className="access-simulator-page">
      <section className="access-heading">
        <div><div className="access-brand-mark">♢</div><div><h2>Access Simulator</h2><p>Test Zero Trust access decisions in real-time</p></div></div>
        <span className="operational-pill"><i /> Operational</span>
      </section>

      <section className="access-layout">
        <article className="access-panel request-panel">
          <div className="access-panel-title">◉ &nbsp;Access Request Details</div>
          <form onSubmit={execute} className="access-form">
            <label><span>👤 User Identity</span><input value={form.username} onChange={(e) => setField('username', e.target.value)} /></label>
            <label><span>▣ Device Type</span><select value={form.device_type} onChange={(e) => setField('device_type', e.target.value)}><option>Laptop</option><option>Desktop</option><option>Mobile</option><option>Tablet</option></select></label>
            <label><span>◉ Security Posture</span><select value={form.security_posture ? 'Compliant Device' : 'Non-compliant Device'} onChange={(e) => { const trusted = e.target.value === 'Compliant Device'; setField('security_posture', trusted); setField('simulated_device_trusted', trusted) }}><option>Compliant Device</option><option>Non-compliant Device</option></select></label>
            <label><span>▣ Access Resource</span><select value={form.resource} onChange={(e) => setField('resource', e.target.value)}><option value="resources/public">Public Data</option><option value="resources/sensitive">Sensitive Data</option><option value="resources/admin">Admin Console</option></select></label>
            <label><span>⌖ Location</span><select value={form.location} onChange={(e) => setField('location', e.target.value)}><option>Bengaluru, India</option><option>New York, USA</option><option>London, UK</option><option>Unknown Network</option></select></label>
            <label><span>▣ Authentication Status</span><select value={form.auth_status ? 'Authenticated' : 'Unauthenticated'} onChange={(e) => { const authenticated = e.target.value === 'Authenticated'; setField('auth_status', authenticated); setField('simulated_mfa_passed', authenticated) }}><option>Authenticated</option><option>Unauthenticated</option></select></label>
            <label><span>⚠ Risk Level</span><select value={String(form.simulated_risk_score)} onChange={(e) => setField('simulated_risk_score', Number(e.target.value))}><option value="12">Low (12%)</option><option value="45">Medium (45%)</option><option value="82">High (82%)</option></select></label>
            <button className="simulate-button" type="submit" disabled={loading}>▶ &nbsp;{loading ? 'Evaluating Access…' : 'Simulate Access'}</button>
          </form>
          {error && <div className="access-error">{error}</div>}
        </article>

        <div className="access-result-column">
          <article className="access-panel decision-panel">
            <div className="access-panel-title">▥ &nbsp;Access Decision Result <small>◷ &nbsp;{timestamp}</small></div>
            <div className={`decision-banner ${decision ? (decisionAllowed ? 'granted' : 'denied') : 'pending'}`}>
              <span>{decision ? (decisionAllowed ? '✓' : '!') : '◌'}</span><div><strong>{decision ? decisionLabel : 'READY TO SIMULATE'}</strong><p>{decision ? decision.reason : 'Configure the request and run the policy evaluation.'}</p></div>
            </div>
            <div className="decision-summary">
              <div className="score-gauge" style={{ '--score': `${Math.max(0, Math.min(100, risk)) * 3.6}deg` } as CSSProperties}><div><strong>{risk}%</strong><small>Risk Score</small></div></div>
              <div className="evaluation-list"><h3>Evaluation Summary</h3><span>● User: <b>{form.username}</b></span><span>● Device: <b>{form.simulated_device_trusted ? 'Compliant' : 'Untrusted'}</b></span><span>● Location: <b>{form.location === 'Unknown Network' ? 'Untrusted Network' : 'Trusted Network'}</b></span><span>● Resource: <b>{decisionAllowed ? 'Allowed' : 'Pending'}</b></span><span>● Policy: <b>{decision ? decisionLabel : 'Not evaluated'}</b></span></div>
              <div className="policy-tile"><b>Zero Trust Policy</b><strong>✓</strong><span>ZT-Policy-001</span><em>Effect: {decisionAllowed ? 'Allow' : 'Evaluate'}</em></div>
            </div>
          </article>
          <article className="access-panel details-panel">
            <div className="access-panel-title">▣ &nbsp;Decision Details <button type="button" onClick={() => window.location.assign('/audit-logs')}>View Logs →</button></div>
            {decision ? <div className="decision-details"><strong className={decisionAllowed ? 'detail-success' : 'detail-danger'}>{decisionAllowed ? '● Access granted due to valid credentials, compliant device and low risk score.' : '● Access requires attention based on current policy checks.'}</strong><p>{decision.explanation || decision.reason}</p><small>{decision.checks?.join(' · ')}</small></div> : <div className="decision-details muted-details"><strong>● Run a simulation to see the policy decision.</strong><p>The request will be evaluated against user authorization, device posture, MFA, location and risk threshold.</p></div>}
          </article>
        </div>
      </section>
    </div>
  )
}

function UsersPage({ token, currentUser }: { token: string; currentUser: User | null }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const result = await apiFetch('/users', { method: 'GET' }, token)
        setUsers(result)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  return (
    <div className="page-card">
      <h2>Users & Roles</h2>

      <div className="toolbar">
        <input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          <option>viewer</option>
          <option>analyst</option>
          <option>administrator</option>
        </select>
        <select>
          <option>All statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.filter((user) => (
              (roleFilter === 'all' || user.role === roleFilter) &&
              user.username.toLowerCase().includes(search.toLowerCase())
            )).map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>
                  <span className={user.is_active ? 'status success' : 'status danger'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className="tiny-button" type="button" onClick={async () => {
                    const nextRole = user.role === 'viewer' ? 'analyst' : user.role === 'analyst' ? 'administrator' : 'viewer'
                    try {
                      await apiFetch(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ role: nextRole }) }, token)
                      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role: nextRole } : item))
                    } catch (e) {
                      setError((e as Error).message)
                    }
                  }}>
                    Cycle role
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PoliciesPage({ token }: { token: string }) {
  const [config, setConfig] = useState<PolicyConfig>({
    risk_threshold: 70,
    require_trusted_device_for_high_sensitivity: true,
    require_mfa_for_high_sensitivity: false,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rules, setRules] = useState<PolicyRule[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [ruleForm, setRuleForm] = useState({
    name: '',
    tenant: 'default',
    description: '',
    effect: 'allow',
    priority: 1,
    identities: '',
    resources: '',
    actions: '',
    conditions: '',
    enabled: true,
  })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [configResult, rulesResult] = await Promise.all([
          apiFetch('/policy/config', { method: 'GET' }, token),
          apiFetch('/policy/rules', { method: 'GET' }, token),
        ])
        setConfig(configResult)
        setRules(rulesResult)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const save = async () => {
    try {
      setLoading(true)
      await apiFetch('/policy/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      }, token)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const resetRuleForm = () => {
    setRuleForm({ name: '', tenant: 'default', description: '', effect: 'allow', priority: rules.length + 1, identities: '', resources: '', actions: '', conditions: '', enabled: true })
    setEditingId(null)
  }

  const editRule = (rule: PolicyRule) => {
    setRuleForm({
      name: rule.name,
      tenant: rule.tenant,
      description: rule.description,
      effect: rule.effect,
      priority: rule.priority,
      identities: (rule.identities ?? []).join(', '),
      resources: (rule.resources ?? []).join(', '),
      actions: (rule.actions ?? []).join(', '),
      conditions: (rule.conditions ?? []).join(', '),
      enabled: rule.enabled,
    })
    setEditingId(rule.id)
    setShowForm(true)
  }

  const saveRule = async (event: FormEvent) => {
    event.preventDefault()
    try {
      setLoading(true)
      const payload = {
        ...ruleForm,
        identities: ruleForm.identities.split(',').map((item) => item.trim()).filter(Boolean),
        resources: ruleForm.resources.split(',').map((item) => item.trim()).filter(Boolean),
        actions: ruleForm.actions.split(',').map((item) => item.trim()).filter(Boolean),
        conditions: ruleForm.conditions.split(',').map((item) => item.trim()).filter(Boolean),
      }
      const result = await apiFetch(editingId ? `/policy/rules/${editingId}` : '/policy/rules', {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      }, token)
      setRules((current) => editingId ? current.map((rule) => rule.id === editingId ? result : rule) : [...current, result].sort((a, b) => a.priority - b.priority))
      setShowForm(false)
      resetRuleForm()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const deleteRule = async (id: number) => {
    if (!window.confirm('Delete this policy rule?')) return
    try {
      setLoading(true)
      await apiFetch(`/policy/rules/${id}`, { method: 'DELETE' }, token)
      setRules((current) => current.filter((rule) => rule.id !== id))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const toggleRule = async (rule: PolicyRule) => {
    try {
      setLoading(true)
      const payload = {
        name: rule.name, tenant: rule.tenant, description: rule.description, effect: rule.effect,
        priority: rule.priority, identities: rule.identities, resources: rule.resources,
        actions: rule.actions, conditions: rule.conditions, enabled: !rule.enabled,
      }
      const result = await apiFetch(`/policy/rules/${rule.id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token)
      setRules((current) => current.map((item) => item.id === rule.id ? result : item))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const visibleRules = rules.filter((rule) => rule.name.toLowerCase().includes(search.toLowerCase()) || rule.description.toLowerCase().includes(search.toLowerCase()))
  const activeCount = rules.filter((rule) => rule.enabled).length
  const disabledCount = rules.length - activeCount
  const mfaCount = rules.filter((rule) => rule.conditions?.some((condition: string) => condition.toLowerCase().includes('mfa'))).length

  return (
    <div className="policies-page">
      <section className="policies-heading"><div><div className="policies-brand-mark">♢</div><div><h2>Policies Management</h2><p>Manage Zero Trust security policies and rules</p></div></div><span className="operational-pill"><i /> Operational</span></section>
      <section className="policy-stats">
        <div><b>▤</b><span><strong>{rules.length}</strong><small>Total Policies</small><em>↑ 12%</em></span><i /></div>
        <div><b>✓</b><span><strong>{activeCount}</strong><small>Active Policies</small><em>↑ 8%</em></span><i /></div>
        <div><b>Ⅱ</b><span><strong>{disabledCount}</strong><small>Disabled Policies</small><em className="down">↓ 1%</em></span><i /></div>
        <div><b>★</b><span><strong>{mfaCount}</strong><small>Require MFA</small><em>↑ 0%</em></span><i /></div>
      </section>
      <section className="policies-layout">
        <article className="policy-table-panel">
          <div className="policy-toolbar"><h3>⬟ Security Policies</h3><input placeholder="⌕  Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} /><button type="button">⚑ Filter</button><button type="button" className="create-policy-button" onClick={() => { resetRuleForm(); setShowForm(true) }}>＋ Create Policy</button></div>
          {error && <div className="policy-error">{error}</div>}
          <div className="policy-table-wrap"><table className="policy-table"><thead><tr><th>Policy Name</th><th>Effect</th><th>Conditions</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {visibleRules.map((rule) => <tr key={rule.id}><td><strong>{rule.name}</strong><small>{rule.description || 'Zero Trust policy rule'}</small></td><td><span className={`effect-pill ${rule.effect}`}>{rule.effect === 'allow' ? 'Allow' : 'Deny'}</span></td><td>{(rule.conditions ?? []).slice(0, 2).map((condition: string) => <span className="condition-line" key={condition}>{condition}</span>)}</td><td>{rule.priority}</td><td><span className={`policy-status ${rule.enabled ? 'active' : 'disabled'}`}>● {rule.enabled ? 'Active' : 'Disabled'}</span></td><td><button className="row-action edit" onClick={() => editRule(rule)}>✎</button><button className="row-action delete" onClick={() => deleteRule(rule.id)}>♜</button><button className="row-action more" onClick={() => toggleRule(rule)}>…</button></td></tr>)}
            {!visibleRules.length && <tr><td colSpan={6} className="policy-empty">No policy rules found.</td></tr>}
          </tbody></table></div>
          <div className="policy-footer"><span>Showing 1 to {visibleRules.length} of {rules.length} policies</span><div><button>‹</button><b>1</b><button>2</button><button>3</button><button>4</button><button>›</button></div></div>
        </article>
        <aside className="new-policy-panel">
          <h3>＋ &nbsp;{editingId ? 'Edit Policy' : 'Create New Policy'}</h3>
          {showForm ? <form onSubmit={saveRule} className="new-policy-form">
            <label>Policy Name *<input required placeholder="Enter policy name" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} /></label>
            <label>Tenant<input placeholder="default" value={ruleForm.tenant} onChange={(e) => setRuleForm({ ...ruleForm, tenant: e.target.value })} /></label>
            <label>Effect *<select value={ruleForm.effect} onChange={(e) => setRuleForm({ ...ruleForm, effect: e.target.value })}><option value="allow">● Allow</option><option value="deny">● Deny</option></select></label>
            <label>Identities<input placeholder="admin, analyst" value={ruleForm.identities} onChange={(e) => setRuleForm({ ...ruleForm, identities: e.target.value })} /></label>
            <label>Resources<input placeholder="resources/sensitive" value={ruleForm.resources} onChange={(e) => setRuleForm({ ...ruleForm, resources: e.target.value })} /></label>
            <label>Actions<input placeholder="read, write, manage" value={ruleForm.actions} onChange={(e) => setRuleForm({ ...ruleForm, actions: e.target.value })} /></label>
            <label>Conditions<input placeholder="device_trusted, mfa_passed" value={ruleForm.conditions} onChange={(e) => setRuleForm({ ...ruleForm, conditions: e.target.value })} /></label>
            <label>Priority<input type="number" min={0} value={ruleForm.priority} onChange={(e) => setRuleForm({ ...ruleForm, priority: Number(e.target.value) })} /></label>
            <label>Description<textarea value={ruleForm.description} onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })} /></label>
            <label className="policy-toggle"><input type="checkbox" checked={ruleForm.enabled} onChange={(e) => setRuleForm({ ...ruleForm, enabled: e.target.checked })} /> Enable Policy</label>
            <button className="policy-submit" type="submit" disabled={loading}>▣ &nbsp;{loading ? 'Saving…' : editingId ? 'Update Policy' : 'Create Policy'}</button>
            <button className="policy-cancel" type="button" onClick={() => { setShowForm(false); resetRuleForm() }}>Cancel</button>
          </form> : <div className="policy-side-empty"><p>Create a policy rule to control access decisions.</p><button className="policy-submit" onClick={() => { resetRuleForm(); setShowForm(true) }}>＋ Create Policy</button><div className="policy-config"><strong>Global policy settings</strong><label>Risk threshold<input type="number" min={0} max={100} value={config.risk_threshold} onChange={(e) => setConfig({ ...config, risk_threshold: Number(e.target.value) })} /></label><label className="policy-toggle"><input type="checkbox" checked={config.require_trusted_device_for_high_sensitivity} onChange={(e) => setConfig({ ...config, require_trusted_device_for_high_sensitivity: e.target.checked })} /> Trusted device required</label><label className="policy-toggle"><input type="checkbox" checked={config.require_mfa_for_high_sensitivity} onChange={(e) => setConfig({ ...config, require_mfa_for_high_sensitivity: e.target.checked })} /> MFA required</label><button className="policy-save-config" onClick={save}>Save Global Settings</button></div></div>}
        </aside>
      </section>
    </div>
  )
}

function AuditLogsPage({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [decisionFilter, setDecisionFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError('')
      const result = await apiFetch('/audit/logs?page=1&page_size=500', { method: 'GET' }, token)
      setLogs(result)
      setSelected((current: any) => current ? result.find((item: any) => item.id === current.id) ?? current : result[0] ?? null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(true), 5000)
    return () => window.clearInterval(timer)
  }, [token])

  const filteredLogs = logs.filter((log) => {
    const haystack = `${log.user} ${log.resource} ${log.action} ${log.reason} ${log.decision}`.toLowerCase()
    return (decisionFilter === 'all' || log.decision === decisionFilter) && haystack.includes(search.toLowerCase())
  })
  const pages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const visibleLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize)
  const totalEvents = logs.length
  const securityEvents = logs.filter((log) => log.action || log.resource).length
  const criticalEvents = logs.filter((log) => Number(log.risk_score) >= 80 || log.decision === 'deny').length
  const failedLogins = logs.filter((log) => `${log.action} ${log.reason}`.toLowerCase().includes('login')).length
  const formatTime = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value))
  const severity = (log: any) => Number(log.risk_score) >= 80 ? 'Critical' : log.decision === 'deny' ? 'High' : Number(log.risk_score) >= 50 ? 'Medium' : 'Low'
  const exportCsv = () => {
    const headers = ['Timestamp', 'User', 'Resource', 'Action', 'Decision', 'Risk Score', 'Reason']
    const rows = filteredLogs.map((log) => [log.timestamp, log.user, log.resource, log.action, log.decision, log.risk_score, log.reason])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'zero-trust-audit-logs.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="audit-page">
      <section className="audit-heading"><div><div className="audit-brand-mark">▤</div><div><h2>Audit Logs</h2><p>Track and monitor all security events and activities</p></div></div><span className="operational-pill"><i /> Operational</span></section>
      <section className="audit-stats">
        <div><b>✓</b><span><strong>{totalEvents.toLocaleString()}</strong><small>Total Events</small><em>↑ 12%</em></span><i /></div>
        <div><b>✓</b><span><strong>{securityEvents.toLocaleString()}</strong><small>Security Events</small><em>↑ 8%</em></span><i /></div>
        <div><b>!</b><span><strong>{criticalEvents.toLocaleString()}</strong><small>Critical Events</small><em className="bad">↑ 5%</em></span><i /></div>
        <div><b>i</b><span><strong>{failedLogins.toLocaleString()}</strong><small>Failed Logins</small><em>↑ 15%</em></span><i /></div>
      </section>
      <section className="audit-filters"><select><option>▣ Last 24 Hours</option><option>Last 7 Days</option><option>Last 30 Days</option></select><select><option>All Users</option></select><select><option>All Event Types</option></select><select value={decisionFilter} onChange={(e) => { setDecisionFilter(e.target.value); setPage(1) }}><option value="all">All Severities</option><option value="allow">Low / Allowed</option><option value="deny">High / Denied</option></select><select><option>All Statuses</option></select><input placeholder="⌕ Search logs..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /><button onClick={exportCsv}>⇩ Export CSV</button><button onClick={() => window.print()}>▣ Export PDF</button></section>
      <section className="audit-layout">
        <article className="audit-table-panel">
          <div className="audit-panel-title"><span>☷ &nbsp;Audit Logs</span><small>{loading ? 'Updating…' : `Showing ${filteredLogs.length ? (page - 1) * pageSize + 1 : 0}–${Math.min(page * pageSize, filteredLogs.length)} of ${filteredLogs.length} logs`} <i /> Live</small></div>
          <div className="audit-table-wrap"><table className="audit-table"><thead><tr><th>Time</th><th>Event</th><th>User</th><th>IP Address</th><th>Severity</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {visibleLogs.map((log, index) => <tr key={log.id ?? index} className={selected?.id === log.id ? 'selected-row' : ''} onClick={() => setSelected(log)}><td>{formatTime(log.timestamp)}</td><td><span className="audit-event-icon">{log.decision === 'deny' ? '◆' : '●'}</span>{log.action || 'Access Decision'}</td><td>{log.user || 'system'}</td><td>{log.ip_address || '—'}</td><td><span className={`severity-pill ${severity(log).toLowerCase()}`}>{severity(log)}</span></td><td><span className={`audit-status ${log.decision === 'allow' ? 'success' : 'blocked'}`}>{log.decision === 'allow' ? 'Success' : 'Blocked'}</span></td><td><button className="view-log" onClick={(event) => { event.stopPropagation(); setSelected(log) }}>◉</button></td></tr>)}
            {!visibleLogs.length && <tr><td colSpan={7} className="audit-empty">{error || 'No audit events match the current filters.'}</td></tr>}
          </tbody></table></div>
          <div className="audit-footer"><div>{Array.from({ length: Math.min(pages, 5) }, (_, index) => <button className={page === index + 1 ? 'current' : ''} key={index} onClick={() => setPage(index + 1)}>{index + 1}</button>)}<button onClick={() => setPage(Math.min(pages, page + 1))}>›</button></div><label>Rows per page: <select><option>10</option></select></label></div>
        </article>
        <aside className="audit-detail-panel">
          <div className="audit-panel-title">▣ &nbsp;Log Details</div>
          {selected ? <div className="audit-detail-content"><div className="audit-detail-heading"><span className="detail-alert">{selected.decision === 'deny' ? '!' : '✓'}</span><strong>{selected.decision === 'deny' ? 'Access Denied' : 'Access Granted'}</strong><em className={severity(selected).toLowerCase()}>{severity(selected)} Severity</em></div><dl><dt>Time</dt><dd>{formatTime(selected.timestamp)}</dd><dt>User</dt><dd>{selected.user || 'system'}</dd><dt>IP Address</dt><dd>{selected.ip_address || 'Not recorded'}</dd><dt>Event</dt><dd>{selected.action || 'Access Decision'}</dd><dt>Status</dt><dd className={selected.decision === 'allow' ? 'detail-green' : 'detail-red'}>{selected.decision === 'allow' ? 'Success' : 'Blocked'}</dd></dl><h4>Description</h4><p className="detail-description">{selected.reason || 'No description was provided for this event.'}</p><h4>Additional Information</h4><dl><dt>Resource</dt><dd>{selected.resource || '—'}</dd><dt>Risk Score</dt><dd>{selected.risk_score ?? 0}</dd><dt>Correlation ID</dt><dd>{selected.correlation_id || '—'}</dd></dl><button className="detail-button" onClick={() => window.alert(JSON.stringify(selected, null, 2))}>▣ &nbsp;View Full Details</button></div> : <div className="audit-no-selection">Select a log to view all available information.</div>}
        </aside>
      </section>
    </div>
  )
}

type NetworkMapData = {
  status: string
  metrics: { total_devices: number; secure_devices: number; risk_devices: number; active_connections: number }
  nodes: Array<{ id: string; label: string; subtitle: string; kind: string; status: string }>
  threat_activity: Array<{ label: string; color: string; time: string }>
  zones: Array<{ label: string; subtitle: string; score: number; kind: string }>
}

function NetworkMapPage({ token }: { token: string }) {
  const [data, setData] = useState<NetworkMapData | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setError('')
      setData(await apiFetch<NetworkMapData>('/network/map', { method: 'GET' }, token))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Network map unavailable')
    }
  }

  useEffect(() => { void load() }, [token])

  if (!data) return <div className="page-card">{error || 'Loading network map…'}</div>
  const metricCards = [
    { label: 'Total Devices', value: data.metrics.total_devices, change: '5%', icon: '◎', kind: 'blue' },
    { label: 'Secure Devices', value: data.metrics.secure_devices, change: '8%', icon: '✓', kind: 'green' },
    { label: 'At Risk Devices', value: data.metrics.risk_devices, change: '0%', icon: '!', kind: 'amber' },
    { label: 'Active Connections', value: data.metrics.active_connections, change: '12%', icon: '▦', kind: 'purple' },
  ]
  const node = (id: string) => data.nodes.find((item) => item.id === id)

  return (
    <div className="network-page">
      <section className="network-heading"><div className="network-brand-mark">✣</div><div><h2>Network Map</h2><p>Real-time network topology and security status</p></div><span className="operational-pill"><i /> {data.status}</span><button className="tiny-button network-refresh" type="button" onClick={() => void load()}>↻ Refresh</button></section>
      <section className="network-metrics">{metricCards.map((card) => <div className="network-metric" key={card.label}><span className={`metric-icon ${card.kind}`}>{card.icon}</span><div><small>{card.label}</small><strong>{card.value.toLocaleString()}</strong><em className={card.kind === 'amber' ? 'negative' : 'positive'}>↑ {card.change}</em></div><span className={`metric-spark ${card.kind}`} /></div>)}</section>
      <section className="network-main-grid">
        <article className="network-panel topology-panel"><div className="network-panel-header"><span>✣ &nbsp;Network Topology</span><span className="panel-actions"><i /> Live &nbsp; ↻ Refresh</span></div><div className="topology-canvas"><div className="map-grid" /><div className="topology-line line-horizontal" /><div className="topology-line line-vertical" /><div className="topology-node internet">{node('internet')?.label}<small>☁</small></div><div className="topology-node gateway"><small>♙</small><strong>Zero Trust<br />Gateway</strong></div><div className="topology-node firewall">{node('firewall')?.label}<small>▤</small></div><div className="topology-children">{['employees', 'servers', 'databases', 'guests'].map((id) => { const item = node(id); return <div className={`topology-child ${item?.kind}`} key={id}><span>{id === 'employees' ? '▣' : id === 'servers' ? '▤' : id === 'databases' ? '◉' : '♟'}</span><strong>{item?.label}</strong><small>{item?.subtitle}</small></div> })}</div><span className="connection-check check-one">✓</span><span className="connection-check check-two">✓</span><span className="connection-check check-three">✓</span></div></article>
        <aside className="network-side"><article className="network-panel threat-panel"><div className="network-panel-header"><span>▥ &nbsp;Threat Activity</span><button type="button">View All →</button></div>{data.threat_activity.map((event) => <div className="threat-row" key={event.label}><i className={event.color} /><strong>{event.label}</strong><time>{event.time}</time></div>)}</article><article className="network-panel legend-panel"><div className="network-panel-header"><span>▤ &nbsp;Network Legend</span></div><div className="legend-row"><i className="legend-gateway" />Zero Trust Gateway</div><div className="legend-row"><i className="legend-firewall" />Firewall</div><div className="legend-row"><i className="legend-network" />Trusted Network</div><div className="legend-row"><i className="legend-resource" />Protected Resources</div><div className="legend-row"><i className="legend-guest" />Restricted Access</div></article></aside>
      </section>
      <section className="network-bottom-grid"><article className="network-panel chart-panel"><div className="network-panel-header"><span>▦ &nbsp;Traffic Overview</span><span className="chart-legend"><i className="allowed" /> Allowed <i className="blocked" /> Blocked <i className="monitored" /> Monitored</span></div><div className="traffic-chart"><div className="chart-y"><span>1,000</span><span>500</span><span>0</span></div><svg viewBox="0 0 640 130" preserveAspectRatio="none"><path className="chart-line allowed-line" d="M0 49 L45 44 L90 48 L135 40 L180 45 L225 35 L270 42 L315 31 L360 37 L405 26 L450 33 L495 23 L540 38 L585 29 L640 34" /><path className="chart-line blocked-line" d="M0 94 L45 90 L90 96 L135 87 L180 92 L225 89 L270 95 L315 88 L360 94 L405 84 L450 91 L495 86 L540 93 L585 87 L640 91" /><path className="chart-line monitored-line" d="M0 108 L45 105 L90 107 L135 103 L180 107 L225 102 L270 105 L315 101 L360 104 L405 98 L450 102 L495 96 L540 103 L585 97 L640 100" /></svg><div className="chart-x"><span>12AM</span><span>4AM</span><span>8AM</span><span>12PM</span><span>4PM</span><span>8PM</span><span>12AM</span></div></div></article><article className="network-panel zones-panel"><div className="network-panel-header"><span>◉ &nbsp;Security Zones</span><button type="button">View Details →</button></div><div className="zone-list">{data.zones.map((zone) => <div className={`zone-card ${zone.kind}`} key={zone.label}><span>{zone.kind === 'internal' ? '✓' : zone.kind === 'dmz' ? '⌁' : zone.kind === 'guest' ? '♣' : '◎'}</span><strong>{zone.label}</strong><small>{zone.subtitle}</small><b>({zone.score}%)</b></div>)}</div></article></section>
      {error && <div className="error-banner">{error}</div>}
    </div>
  )
}

function ReportsPage({ token }: { token: string }) {
  const [reportStatus, setReportStatus] = useState('')
  const [summary, setSummary] = useState<{
    total_threats: number
    blocked_threats: number
    critical_events: number
    active_users: number
    recent_reports: Array<{ name: string; generated_on: string; status: string }>
  } | null>(null)
  const [reportType, setReportType] = useState('Security Report')
  const [range, setRange] = useState('Last 30 Days')

  useEffect(() => {
    void apiFetch('/reports/summary', { method: 'GET' }, token)
      .then(setSummary)
      .catch((error) => setReportStatus(error instanceof Error ? error.message : 'Report summary unavailable'))
  }, [token])

  const downloadCsv = async () => {
    try {
      const response = await fetch(`${API}/reports/csv`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('CSV export failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'zero-trust-audit.csv'
      link.click()
      URL.revokeObjectURL(url)
      setReportStatus('CSV report downloaded.')
    } catch (e) {
      setErrorMessage((e as Error).message)
    }
  }

  const downloadPdf = async () => {
    try {
      const response = await fetch(`${API}/reports/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error('PDF export failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'zero-trust-audit.pdf'
      link.click()
      URL.revokeObjectURL(url)
      setReportStatus('PDF report downloaded.')
    } catch (e) {
      setErrorMessage((e as Error).message)
    }
  }

  function setErrorMessage(message: string) {
    setReportStatus(message)
  }

  const reportCards = [
    { title: 'Security Report', subtitle: '(Overview)', icon: '✓', kind: 'blue' },
    { title: 'Activity Report', subtitle: '(User Activity)', icon: '●', kind: 'indigo' },
    { title: 'Risk Report', subtitle: '(Risk Analysis)', icon: '!', kind: 'amber' },
    { title: 'Compliance Report', subtitle: '(Regulatory)', icon: '⚖', kind: 'purple' },
  ]
  const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))

  return (
    <div className="reports-page">
      <section className="reports-heading"><div className="report-brand-mark">▣</div><div><h2>Reports</h2><p>Generate and view comprehensive security reports</p></div><span className="operational-pill"><i /> Operational</span></section>
      <section className="report-type-tabs">{reportCards.map((card, index) => <button className={`report-type-tab ${index === 0 ? 'selected' : ''}`} type="button" key={card.title} onClick={() => setReportType(card.title)}><span className={`report-type-icon ${card.kind}`}>{card.icon}</span><strong>{card.title}<small>{card.subtitle}</small></strong></button>)}</section>
      <section className="report-controls"><label>Time Range<select value={range} onChange={(event) => setRange(event.target.value)}><option>Last 30 Days</option><option>Last 7 Days</option><option>Last 90 Days</option></select></label><label>Format<select><option>PDF</option><option>CSV</option></select></label><button className="primary-button" type="button" onClick={downloadPdf}>▶ Generate Report</button><button className="ghost-button" type="button" onClick={downloadCsv}>⇩ Export CSV</button></section>
      <section className="report-stats">{[
        ['Total Threats', summary?.total_threats ?? 0, '↑ 12%', 'blue'],
        ['Blocked Threats', summary?.blocked_threats ?? 0, '↑ 14%', 'green'],
        ['Critical Events', summary?.critical_events ?? 0, '↑ 3%', 'amber'],
        ['Active Users', summary?.active_users ?? 0, '↑ 8%', 'purple'],
      ].map(([label, value, change, kind]) => <div className="report-stat" key={label as string}><span className={`report-stat-icon ${kind}`}>{kind === 'blue' ? '✓' : kind === 'green' ? '✓' : kind === 'amber' ? '!' : '♣'}</span><div><small>{label}</small><strong>{Number(value).toLocaleString()}</strong><em className={kind === 'amber' ? 'negative' : 'positive'}>{change}</em></div><span className={`report-spark ${kind}`} /></div>)}</section>
      <section className="reports-dashboard-grid">
        <article className="report-panel trends-panel"><div className="report-panel-header"><span>▥ &nbsp;Security Trends</span><div className="range-pills"><button type="button">7D</button><button className="active" type="button">30D</button><button type="button">90D</button></div></div><div className="report-chart"><div className="report-y"><span>8k</span><span>4k</span><span>0</span></div><svg viewBox="0 0 640 130" preserveAspectRatio="none"><path className="report-line threat" d="M0 49 L45 44 L90 48 L135 40 L180 45 L225 35 L270 42 L315 31 L360 37 L405 26 L450 33 L495 23 L540 38 L585 29 L640 34" /><path className="report-line blocked" d="M0 72 L45 67 L90 73 L135 65 L180 70 L225 62 L270 69 L315 60 L360 66 L405 57 L450 63 L495 54 L540 65 L585 57 L640 61" /><path className="report-line critical" d="M0 104 L45 103 L90 105 L135 102 L180 104 L225 101 L270 103 L315 100 L360 102 L405 98 L450 101 L495 97 L540 101 L585 98 L640 100" /></svg><div className="report-x"><span>Oct 6</span><span>Oct 10</span><span>Oct 14</span><span>Oct 18</span><span>Oct 22</span><span>Oct 26</span><span>Oct 30</span><span>Nov 3</span></div></div></article>
        <article className="report-panel distribution-panel"><div className="report-panel-header"><span>◉ &nbsp;Threat Distribution</span></div><div className="donut-wrap"><div className="donut"><strong>{(summary?.total_threats ?? 0).toLocaleString()}</strong><small>Total Threats</small></div><div className="distribution-list"><span>● Malware <b>35%</b></span><span>● Suspicious <b>28%</b></span><span>● Policy <b>20%</b></span><span>● Other <b>17%</b></span></div></div></article>
        <article className="report-panel sources-panel"><div className="report-panel-header"><span>⌖ &nbsp;Top Threat Sources</span><button type="button">View All →</button></div><div className="source-content"><div className="fake-map">✦　　◌　　✦<br />　◌　✦　　◌</div><div className="source-list"><span>🇺🇸 United States <b>32%</b></span><span>🇩🇪 Germany <b>24%</b></span><span>🇨🇳 China <b>20%</b></span><span>🇮🇳 India <b>14%</b></span><span>🌐 Others <b>10%</b></span></div></div></article>
        <article className="report-panel recent-panel"><div className="report-panel-header"><span>▤ &nbsp;Recent Reports</span><button type="button">View All →</button></div>{(summary?.recent_reports ?? []).map((report, index) => <div className="recent-report" key={`${report.name}-${index}`}><span><strong>{reportType}</strong><small>{formatDate(report.generated_on)}</small></span><em>{report.status}</em><button type="button" onClick={downloadPdf}>↧</button></div>)}</article>
        <article className="report-panel preview-panel"><div className="report-panel-header"><span>▤ &nbsp;Report Preview</span></div><div className="preview-document"><div className="preview-shield">♙</div><h3>Zero Trust<br />Security Report</h3><p>Comprehensive Security Overview</p><hr /><small>Report Period</small><strong>{range}</strong><div className="preview-city">▥ ▥ ▥ ▥ ▥</div></div></article>
      </section>
      {reportStatus && <div className="success-banner">{reportStatus}</div>}
    </div>
  )
}

function RiskAnalysisPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const result = await apiFetch('/risk-analysis', { method: 'GET' }, token)
        setData(result)
      } catch {
        // ignore
      }
    }
    load()
  }, [token])

  const metrics = data?.metrics ?? { total_risk_score: 78, high_risk_assets: 12, medium_risk_assets: 27, low_risk_assets: 49 }
  const factors = data?.risk_factors ?? []
  const assets = data?.asset_types ?? []
  const events = data?.recent_events ?? []
  const formatTime = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

  return (
    <div className="risk-page">
      <section className="risk-heading"><div className="risk-brand-mark">⚠</div><div><h2>Risk Analysis</h2><p>Analyze security risks and identify potential threats.</p></div><select className="risk-range"><option>Last 30 Days</option><option>Last 7 Days</option><option>Last 90 Days</option></select><span className="operational-pill"><i /> Operational</span></section>
      <section className="risk-stats">{[
        ['Total Risk Score', `${metrics.total_risk_score} / 100`, '↑ 12%', 'red', '⚠'],
        ['High Risk Assets', metrics.high_risk_assets, '↑ 33%', 'orange', '!'],
        ['Medium Risk Assets', metrics.medium_risk_assets, '↓ 7%', 'blue', '🛡'],
        ['Low Risk Assets', metrics.low_risk_assets, '↑ 5%', 'green', '✓'],
      ].map(([label, value, change, kind, icon]) => <div className="risk-stat" key={label as string}><span className={`risk-stat-icon ${kind}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong><em className={kind === 'blue' || kind === 'green' ? 'positive' : 'negative'}>{change}</em></div><span className={`risk-spark ${kind}`} /></div>)}</section>
      <section className="risk-grid">
        <article className="risk-panel risk-trend"><div className="risk-panel-header"><span>▥ &nbsp;Risk Trend</span><span className="risk-legend"><i className="risk-blue" /> Risk Score &nbsp; <i className="risk-orange" /> High Risk Assets &nbsp; <i className="risk-green" /> Security Events</span></div><div className="risk-chart"><div className="risk-chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><svg viewBox="0 0 640 150" preserveAspectRatio="none"><path className="risk-line risk-blue-line" d="M0 50 L45 55 L90 43 L135 48 L180 37 L225 42 L270 34 L315 38 L360 29 L405 34 L450 25 L495 31 L540 22 L585 28 L640 24" /><path className="risk-line risk-orange-line" d="M0 85 L45 92 L90 78 L135 86 L180 72 L225 80 L270 68 L315 75 L360 64 L405 71 L450 59 L495 68 L540 58 L585 64 L640 60" /><path className="risk-line risk-green-line" d="M0 112 L45 110 L90 114 L135 108 L180 112 L225 106 L270 110 L315 104 L360 108 L405 101 L450 105 L495 99 L540 104 L585 98 L640 101" /></svg><div className="risk-chart-x"><span>Oct 6</span><span>Oct 10</span><span>Oct 14</span><span>Oct 18</span><span>Oct 22</span><span>Oct 26</span><span>Oct 30</span><span>Nov 3</span></div></div></article>
        <article className="risk-panel risk-distribution"><div className="risk-panel-header"><span>◉ &nbsp;Risk Distribution</span></div><div className="risk-donut-wrap"><div className="risk-donut"><strong>{metrics.total_risk_score}</strong><small>Total Risk</small></div><div className="risk-distribution-list"><span>● Critical <b>18%</b></span><span>● High <b>32%</b></span><span>● Medium <b>34%</b></span><span>● Low <b>16%</b></span></div></div></article>
        <article className="risk-panel risk-factors"><div className="risk-panel-header"><span>☷ &nbsp;Top Risk Factors</span><button type="button">View All →</button></div>{factors.map((factor: any) => <div className="factor-row" key={factor.rank}><b>{factor.rank}</b><strong>{factor.name}</strong><span>{factor.score}%</span><em className={factor.severity.toLowerCase()}>{factor.severity}</em></div>)}</article>
        <article className="risk-panel heatmap-panel"><div className="risk-panel-header"><span>⌖ &nbsp;Risk Heatmap</span></div><div className="heatmap-content"><div className="heatmap-map">✦　　◉　　✦<br />　◉　✦　　◉</div><div className="heatmap-legend"><span>● Critical</span><span>● High</span><span>● Medium</span><span>● Low</span></div></div></article>
        <article className="risk-panel asset-panel"><div className="risk-panel-header"><span>▥ &nbsp;Risk by Asset Type</span></div><div className="asset-chart">{assets.map((asset: any) => <div className="asset-bar-group" key={asset.name}><div className="asset-bars"><i style={{ height: `${asset.critical * 2}px` }} /><i style={{ height: `${asset.high * 2}px` }} /><i style={{ height: `${asset.medium * 2}px` }} /></div><small>{asset.name}</small></div>)}</div></article>
        <article className="risk-panel insights-panel"><div className="risk-panel-header"><span>◉ &nbsp;AI Risk Insights</span></div><div className="insight-body"><div className="robot">▣</div><div><strong>Suspicious Login Pattern Detected</strong><p>Multiple failed login attempts from unusual location (Russia).</p><b>Risk Level: <em>High</em></b><small>Recommendation: Enable MFA and review logs.</small><button type="button">View Details →</button></div></div></article>
      </section>
      <section className="risk-panel events-panel"><div className="risk-panel-header"><span>▤ &nbsp;Recent Risk Events</span><div className="event-controls"><input placeholder="⌕ Search events…" /><select><option>All Events</option></select><button type="button">View All →</button></div></div><table className="risk-events-table"><thead><tr><th>Time</th><th>Event</th><th>Risk</th><th>Asset</th><th>Source IP</th><th>Status</th><th>Action</th></tr></thead><tbody>{events.map((event: any, index: number) => <tr key={`${event.time}-${index}`}><td>{formatTime(event.time)}</td><td>{event.event}</td><td><span className="event-risk">{event.risk}</span></td><td>{event.asset}</td><td>185.19.110.153</td><td><span className="event-status">{event.status}</span></td><td><button type="button">View</button></td></tr>)}</tbody></table></section>
    </div>
  )
}

function SecurityTestingPage({ token }: { token: string }) {
  const [tests, setTests] = useState<any[]>([])
  useEffect(() => {
    const load = async () => {
      try {
        const result = await apiFetch('/security-tests/run', { method: 'GET' }, token)
        setTests(result.results ?? [])
      } catch {
        // ignore
      }
    }
    load()
  }, [token])

  return (
    <div className="page-card">
      <h2>Security Testing</h2>

      <table className="data-table">
        <thead>
          <tr>
            <th>Test</th>
            <th>Status</th>
            <th>Actual</th>
            <th>Expected</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test) => (
            <tr key={test.name}>
              <td>{test.name}</td>
              <td>
                <span className={test.status === 'pass' ? 'status success' : 'status danger'}>
                  {test.status ?? 'unknown'}
                </span>
              </td>
              <td>{test.actual}</td>
              <td>{test.expected}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InvestigationsPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [status, setStatus] = useState('All Statuses')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  const load = async () => {
    const query = new URLSearchParams({ status })
    if (search.trim()) query.set('search', search.trim())
    try {
      const result = await apiFetch(`/investigations?${query}`, { method: 'GET' }, token)
      setData(result)
      setSelectedId(result.incidents?.[0]?.id ?? null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Investigation data unavailable')
    }
  }

  useEffect(() => { void load() }, [token, status, search])

  const runAction = async (action: string) => {
    if (!selectedId) return
    try {
      const result = await apiFetch(`/investigations/${selectedId}/actions`, { method: 'POST', body: JSON.stringify({ action }) }, token)
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Investigation action failed')
    }
  }

  const metrics = data?.metrics ?? { total_incidents: 24, investigating: 8, resolved: 14, avg_resolution_minutes: 18 }
  const selected = data?.incidents?.find((item: any) => item.id === selectedId) ?? data?.selected
  const formatTime = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

  return (
    <div className="investigation-page">
      <section className="investigation-heading"><div className="investigation-brand-mark">◈</div><div><h2>Security Investigation</h2><p>Investigate and analyze security incidents in detail</p></div><span className="operational-pill"><i /> Operational</span></section>
      <section className="investigation-stats">{[
        ['Total Incidents', metrics.total_incidents, '↑ 12%', 'red', '!'],
        ['Investigating', metrics.investigating, '↑ 33%', 'orange', '⚠'],
        ['Resolved', metrics.resolved, '↑ 7%', 'green', '✓'],
        ['Avg Resolution Time', `${metrics.avg_resolution_minutes}m`, '↓ 22%', 'purple', '◷'],
      ].map(([label, value, change, kind, icon]) => <div className="investigation-stat" key={label as string}><span className={`investigation-stat-icon ${kind}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong><em className={kind === 'green' || kind === 'purple' ? 'positive' : 'negative'}>{change}</em></div><span className={`investigation-spark ${kind}`} /></div>)}</section>
      <section className="investigation-controls"><select><option>Last 7 Days</option><option>Last 30 Days</option></select><select><option>Event Type: All Events</option></select><select><option>Severity: All Severities</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All Statuses</option><option>Investigating</option><option>Resolved</option></select><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="⌕ Search incidents…" /><button className="primary-button" type="button" onClick={() => void runAction('generate_report')}>⇩ Export Report</button><button className="ghost-button" type="button" onClick={() => void load()}>↻ Refresh</button></section>
      <section className="investigation-main-grid">
        <article className="investigation-panel incident-list-panel"><div className="investigation-panel-header"><span>▤ &nbsp;Security Incidents</span><span>Showing 1–{data?.incidents?.length ?? 0} of {data?.incidents?.length ?? 0}</span></div><table className="incident-table"><thead><tr><th>Time</th><th>Event</th><th>Severity</th><th>Status</th><th>Source IP</th><th>Actions</th></tr></thead><tbody>{(data?.incidents ?? []).map((incident: any) => <tr key={incident.id} className={selectedId === incident.id ? 'selected-incident' : ''} onClick={() => setSelectedId(incident.id)}><td>{formatTime(incident.time)}</td><td>◉ &nbsp;{incident.event}</td><td><span className={`incident-severity ${incident.severity.toLowerCase()}`}>{incident.severity}</span></td><td><span className={`incident-status ${incident.status.toLowerCase()}`}>{incident.status}</span></td><td>{incident.source_ip}</td><td><button type="button" onClick={() => setSelectedId(incident.id)}>View</button></td></tr>)}</tbody></table></article>
        <article className="investigation-panel incident-detail-panel"><div className="investigation-panel-header"><span>⚠ &nbsp;Incident Details</span><button type="button">Close</button></div>{selected ? <div className="incident-detail"><h3>⚠ &nbsp;{selected.event} <span className="incident-severity critical">{selected.severity}</span></h3><p>Unusual login attempt detected from an unusual geographic location.</p><div className="detail-meta"><span>Time<strong>{formatTime(selected.time)}</strong></span><span>Source IP<strong>{selected.source_ip}</strong></span><span>Location<strong>Russia</strong></span><span>User<strong>admin</strong></span></div><div className="detail-tabs"><button type="button">Details</button><button type="button">Evidence</button><button type="button">Related Events</button><button type="button">Actions</button></div><dl><dt>Event Type:</dt><dd>{selected.event}</dd><dt>Risk Score:</dt><dd className="red-text">92/100</dd><dt>Description:</dt><dd>{selected.event}</dd><dt>Firewall Action:</dt><dd><span className="incident-severity critical">Blocked</span></dd><dt>Recommended Action:</dt><dd>Review access source and verify identity</dd></dl><div className="detail-map">◎</div></div> : <div className="empty-investigation">Select an incident to inspect details.</div>}</article>
      </section>
      <section className="investigation-bottom-grid"><article className="investigation-panel timeline-panel"><div className="investigation-panel-header"><span>▥ &nbsp;Attack Timeline</span><span>🔵 Events　🔴 Critical</span></div><svg viewBox="0 0 640 120" preserveAspectRatio="none"><path className="timeline-line events" d="M0 70 L80 60 L160 63 L240 52 L320 59 L400 42 L480 53 L560 34 L640 45" /><path className="timeline-line critical-line" d="M0 92 L80 91 L160 92 L240 88 L320 92 L400 80 L480 89 L560 75 L640 82" /></svg><div className="timeline-labels"><span>Oct 29</span><span>Oct 30</span><span>Oct 31</span><span>Nov 1</span><span>Nov 2</span><span>Nov 3</span><span>Nov 4</span></div></article><article className="investigation-panel sources-analysis"><div className="investigation-panel-header"><span>◉ &nbsp;Threat Source Analysis</span></div><div className="source-donut-wrap"><div className="source-donut"><strong>{metrics.total_incidents}</strong><small>Total Events</small></div><div>{(data?.threat_sources ?? []).map((source: any) => <div className="source-analysis-row" key={source.label}><i className={source.color} />{source.label}<b>{source.value}%</b></div>)}</div></div></article><article className="investigation-panel actions-panel"><div className="investigation-panel-header"><span>☷ &nbsp;Investigation Actions</span></div>{[['block_source','Block Source IP'],['review_activity','Review User Activity'],['check_related','Check Related Systems'],['generate_report','Generate Report']].map(([action, label]) => <button className="investigation-action" type="button" key={action} onClick={() => void runAction(action)}><span>✓</span>{label}</button>)}<button className="primary-button start-investigation" type="button" onClick={() => void runAction('start_investigation')}>▶ Start Investigation →</button></article><article className="investigation-panel under-investigation"><div className="under-icon">♢</div><strong>Threat Under Investigation</strong><small>Continue monitoring for<br />related activities</small></article></section>
      {message && <div className="success-banner">{message}</div>}
    </div>
  )
}

function AssistantPage({ token }: { token: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const send = async (prompt = input) => {
    if (!prompt.trim() || loading) return
    const message = prompt.trim()
    setInput('')
    setMessages((current) => [...current, { id: `${Date.now()}-user`, role: 'user', content: message }])
    setLoading(true)
    try {
      const result = await apiFetch('/assistant', { method: 'POST', body: JSON.stringify({ message }) }, token)
      setMessages((current) => [...current, { id: `${Date.now()}-assistant`, role: 'assistant', content: result.answer }])
    } catch (e) {
      setMessages((current) => [...current, { id: `${Date.now()}-error`, role: 'assistant', content: (e as Error).message }])
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    ['Check Threats', 'Show me current security threats'],
    ['Analyze Risks', 'Analyze the current risk posture'],
    ['Generate Report', 'How do I generate a security report?'],
    ['View Network Map', 'Explain the network map'],
    ['Review Policies', 'Explain the active access policies'],
    ['Run Security Test', 'What security tests are available?'],
  ]
  const suggested = ['Show recent threats', 'Analyze risk trends', 'Check policy status', 'Explain zero trust', 'Generate security report', 'View network activity']

  return (
    <div className="assistant-page">
      <section className="assistant-heading"><div className="assistant-brand-mark">♙</div><div><h2>AI Assistant</h2><p>Your intelligent cybersecurity assistant</p></div><span className="operational-pill"><i /> Operational</span></section>
      <section className="assistant-layout">
        <article className="assistant-chat-panel">
          <div className="assistant-panel-header"><span>♙ &nbsp;Chat with AI Security Assistant</span><span className="assistant-online"><i /> Online</span></div>
          <div className="assistant-messages">
            {messages.length === 0 && <div className="assistant-message-row"><div className="assistant-avatar">♙</div><div className="assistant-bubble"><p>Hello Abhilash! 👋</p><p>I’m your Zero Trust Security Assistant.<br />I can help you with threat analysis, security recommendations, policy management, and more.</p><p>What would you like to know?</p><small>10:45 AM</small></div></div>}
            {messages.map((msg) => <div key={msg.id} className={`assistant-message-row ${msg.role === 'user' ? 'user-message' : ''}`}><div className="assistant-avatar">{msg.role === 'user' ? '●' : '♙'}</div><div className={`assistant-bubble ${msg.role === 'user' ? 'user-bubble' : ''}`}><p>{msg.content}</p><small>{msg.role === 'user' ? '10:46 AM ✓✓' : '10:46 AM'}</small></div></div>)}
          </div>
          <div className="assistant-input-row"><span>♧</span><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void send() }} placeholder="Ask anything about security…" /><button type="button" onClick={() => void send()} disabled={loading}>➤</button></div>
          <div className="suggested-prompts"><strong>✦ Suggested Prompts</strong><div>{suggested.map((prompt) => <button type="button" key={prompt} onClick={() => void send(prompt)}>{prompt} ↗</button>)}</div></div>
        </article>
        <aside className="assistant-sidebar">
          <article className="assistant-side-panel"><div className="assistant-panel-header"><span>ϟ &nbsp;Quick Actions</span></div><div className="quick-action-grid">{quickActions.map(([label, prompt], index) => <button type="button" key={label} onClick={() => void send(prompt)}><span className={`quick-icon q-${index}`}>{index === 0 ? '✓' : index === 1 ? '▥' : index === 2 ? '▤' : index === 3 ? '⌖' : index === 4 ? '✓' : '↻'}</span>{label}</button>)}</div></article>
          <article className="assistant-side-panel insights-card"><div className="assistant-panel-header"><span>💡 &nbsp;Security Insights</span><button type="button">View All →</button></div><div className="system-secure"><span>✓</span><strong>System Status: Secure</strong><small>No critical issues detected. Your system is operating normally.</small></div><div className="insight-row"><i className="red-dot" />Last Threat Detected <b>2 hours ago</b></div><div className="insight-row"><i className="orange-dot" />Risk Score <b>78/100</b></div><div className="insight-row"><i className="blue-dot" />Active Policies <b>24</b></div></article>
          <article className="assistant-side-panel recent-queries"><div className="assistant-panel-header"><span>◷ &nbsp;Recent Queries</span><button type="button">View All →</button></div>{['Show me current security threats', 'What is my risk score?', 'Generate weekly report'].map((query, index) => <button type="button" key={query} onClick={() => void send(query)}><span>▣</span>{query}<small>{index * 4 + 2} min ago</small></button>)}</article>
        </aside>
      </section>
      {status && <div className="success-banner">{status}</div>}
    </div>
  )
}

function DocumentationPage({ token }: { token: string }) {
  const [page, setPage] = useState<any>(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [status, setStatus] = useState('')
  useEffect(() => {
    void apiFetch('/documentation?slug=overview', { method: 'GET' }, token).then(setPage).catch(() => undefined)
  }, [token])

  const download = async (path: string, filename: string) => {
    try {
      const response = await fetch(`${API}${path}`, { headers: { Authorization: 'Bearer ' + token } })
      if (!response.ok) throw new Error('Download unavailable')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
      setStatus(`${filename} downloaded.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Download failed')
    }
  }

  const currentSection = page?.sections?.find((section: any) => section.id === activeSection) ?? page?.sections?.[0]

  return (
    <div className="documentation-page">
      <section className="documentation-heading"><div className="documentation-brand-mark">▣</div><div><h2>Documentation</h2><p>Complete guides and resources for Zero Trust Architecture Simulator</p></div><span className="operational-pill"><i /> {page?.system_info?.status ?? 'Operational'}</span></section>
      <nav className="documentation-tabs">{['Getting Started', 'User Guide', 'Administrator Guide', 'API Reference', 'Tutorials', 'FAQ', 'Release Notes'].map((tab, index) => <button type="button" className={index === 0 ? 'active' : ''} key={tab} onClick={() => index === 1 ? void download('/documentation/download/user-guide', 'zero-trust-user-guide.md') : index === 3 ? window.open('/docs', '_blank') : undefined}>{index === 0 ? '⌂' : index === 1 ? '♟' : index === 2 ? '♙' : index === 3 ? '</>' : index === 4 ? '▶' : '?' } &nbsp;{tab}</button>)}</nav>
      <section className="documentation-layout">
        <aside className="documentation-sidebar"><h3>Documentation Sections</h3>{(page?.sections ?? []).map((section: any, index: number) => <div key={section.id} className="documentation-section-nav"><button type="button" className={activeSection === section.id ? 'selected' : ''} onClick={() => setActiveSection(section.id)}>{index === 0 ? '⌂' : index === 1 ? '⚑' : index === 2 ? '★' : index === 3 ? '⚙' : '</>'} &nbsp;{section.title}<span>{index > 0 ? '⌄' : ''}</span></button>{activeSection === section.id && section.items?.map((item: string) => <a href={`#${section.id}-${item}`} key={item}>{item}</a>)}</div>)}</aside>
        <main className="documentation-main">
          <div className="documentation-hero"><div className="hero-shield">✓</div><div><h2>Zero Trust Architecture<br />Simulator</h2><strong>Build · Monitor · Secure</strong></div><div className="hero-laptop">▰</div></div>
          <article className="documentation-content-card"><div className="documentation-card-header">ⓘ &nbsp;{currentSection?.title ?? 'Overview'}</div><div className="documentation-card-body"><p>{currentSection?.content ?? page?.content ?? 'Loading documentation...'}</p>{currentSection?.id === 'overview' && <><h3>★ &nbsp;Key Features</h3><div className="feature-grid"><span>✓ &nbsp;Real-time Threat Detection</span><span>✓ &nbsp;Risk Analysis & Security Insights</span><span>✓ &nbsp;Zero Trust Policy Management</span><span>✓ &nbsp;Detailed Audit Logs</span><span>✓ &nbsp;Interactive Network Map</span><span>✓ &nbsp;AI-Powered Assistant</span></div></>}{currentSection?.items && <div className="documentation-items">{currentSection.items.map((item: string) => <div id={`${currentSection.id}-${item}`} key={item}><b>●</b><span><strong>{item}</strong><small>{item === 'System Requirements' ? 'Modern browser, active API server, and an authorized user account.' : 'Follow the guided workflow in the application and review the related security evidence.'}</small></span></div>)}</div>}</div></article>
          <article className="documentation-content-card getting-started-card"><div className="documentation-card-header">⚑ &nbsp;Getting Started</div><div className="getting-started-steps"><span>❶ Log in to your account using secure credentials.</span><span>❷ Explore the dashboard to monitor security status.</span><span>❸ Configure policies and simulate access requests.</span><span>❹ Analyze risks and view detailed reports.</span></div><div className="documentation-tip">✓ &nbsp;Tip: Use the sidebar to navigate through different sections and explore all features.</div></article>
        </main>
        <aside className="documentation-rightbar"><article className="documentation-side-card"><h3>ϟ &nbsp;Quick Links</h3><button type="button" onClick={() => void download('/documentation/download/user-guide', 'zero-trust-user-guide.md')}>▣ &nbsp; User Guide</button><button type="button" onClick={() => window.open('/docs', '_blank')}>〈/〉 &nbsp; API Reference</button><button type="button" onClick={() => window.open(page?.video_reference?.url, '_blank')}>▶ &nbsp; Video Tutorials</button><button type="button" onClick={() => void download('/documentation/download/manual', 'zero-trust-manual.md')}>⇩ &nbsp; Download Manual</button></article><article className="documentation-side-card system-info-card"><h3>▣ &nbsp;System Information</h3><p>Version <b>{page?.system_info?.version ?? 'v1.0.0'}</b></p><p>Last Updated <b>{page?.updated_at ? new Date(page.updated_at).toLocaleDateString() : '—'}</b></p><p>License <b>{page?.system_info?.license ?? 'Educational'}</b></p><p>Status <strong>● {page?.system_info?.status ?? 'Operational'}</strong></p></article><article className="documentation-side-card help-card"><h3>♧ &nbsp;Need Help?</h3><p>Contact our support team for any questions or assistance.</p><button className="primary-button" type="button" onClick={() => window.location.href = '/assistant'}>♧ Get Support</button></article><article className="documentation-side-card video-reference-card"><h3>▶ &nbsp;Video Reference</h3><strong>{page?.video_reference?.title}</strong><small>{page?.video_reference?.description}</small><button type="button" onClick={() => window.open(page?.video_reference?.url, '_blank')}>Watch tutorial ↗</button></article></aside>
      </section>
      {status && <div className="success-banner">{status}</div>}
    </div>
  )
}

function SettingsPage({ token, currentUser }: { token: string; currentUser: User | null }) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    theme: localStorage.getItem('zt-theme') ?? 'system',
    timezone: 'UTC',
    two_factor: true,
    session_timeout: '30 minutes',
    password_policy: true,
    login_notifications: true,
    security_alerts: true,
    risk_reports: true,
    policy_changes: false,
    audit_logs: true,
    sidebar: 'Default',
    dashboard_layout: 'Standard',
    color: 'blue',
  })
  const [status, setStatus] = useState('')
  useEffect(() => {
    applyTheme(form.theme, form.color)
  }, [form.theme, form.color])

  useEffect(() => {
    void apiFetch('/auth/me', { method: 'GET' }, token).then((user) => setForm((current) => ({
      ...current,
      full_name: user.full_name,
      email: user.email,
      theme: user.theme ?? current.theme,
      timezone: user.timezone ?? 'UTC',
      ...(user.notification_preferences ? JSON.parse(user.notification_preferences) : {}),
    })))
  }, [token])
  const save = async () => {
    if (form.password && form.password !== form.confirm_password) {
      setStatus('Passwords do not match.')
      return
    }
    try {
      await apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify({
        full_name: form.full_name,
        email: form.email,
        theme: form.theme,
        timezone: form.timezone,
        notification_preferences: {
          security_alerts: form.security_alerts,
          risk_reports: form.risk_reports,
          policy_changes: form.policy_changes,
          audit_logs: form.audit_logs,
          login_notifications: form.login_notifications,
        },
        ...(form.password ? { password: form.password } : {}),
      }) }, token)
      localStorage.setItem('zt-theme', form.theme)
      localStorage.setItem('zt-color', form.color)
      applyTheme(form.theme, form.color)
      setStatus('Settings saved.')
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  const toggle = (key: keyof typeof form) => setForm((current) => ({ ...current, [key]: !current[key] }))
  const setField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))

  return (
    <div className="settings-page">
      <section className="settings-heading"><div className="settings-brand-mark">⚙</div><div><h2>Settings</h2><p>Manage your account, preferences and system configuration.</p></div><span className="operational-pill"><i /> Operational</span></section>
      <nav className="settings-tabs"><button className="active" type="button">● &nbsp;Account</button><button type="button">♜ &nbsp;Security</button><button type="button">♟ &nbsp;Notifications</button><button type="button">◉ &nbsp;Appearance</button><button type="button">▤ &nbsp;System</button><button type="button">☁ &nbsp;Backup & Restore</button></nav>
      <section className="settings-top-grid">
        <article className="settings-panel profile-panel"><div className="settings-panel-title">● &nbsp;Profile Settings</div><div className="profile-header"><div className="profile-avatar">A<span>⚙</span></div><div><h3>{form.full_name || 'User'}</h3><small>{form.email}</small><em>● {currentUser?.role ?? 'User'}</em></div><button type="button">Change Avatar</button></div><label>Full Name<input value={form.full_name} onChange={(event) => setField('full_name', event.target.value)} /></label><label>Email Address<input value={form.email} onChange={(event) => setField('email', event.target.value)} /></label><label>Organization<input value="Zero Trust Security Lab" readOnly /></label><button className="primary-button settings-save-small" type="button" onClick={() => void save()}>▣ &nbsp;Update Profile</button></article>
        <article className="settings-panel security-panel"><div className="settings-panel-title">♜ &nbsp;Security Settings</div>{[['two_factor','Two-Factor Authentication (2FA)','Add an extra layer of security to your account'],['password_policy','Password Policy','Enforce strong password requirements'],['login_notifications','Login Notifications','Get notified of new login attempts']].map(([key, title, description]) => <div className="setting-row" key={key}><span className="setting-row-icon">♜</span><div><strong>{title}</strong><small>{description}</small></div><button type="button" className={`switch ${form[key as keyof typeof form] ? 'on' : ''}`} onClick={() => toggle(key as keyof typeof form)}><i /></button></div>)}<div className="setting-row"><span className="setting-row-icon">◷</span><div><strong>Session Timeout</strong><small>Automatically log out after inactivity</small></div><select value={form.session_timeout} onChange={(event) => setField('session_timeout', event.target.value)}><option>15 minutes</option><option>30 minutes</option><option>60 minutes</option></select></div></article>
      </section>
      <section className="settings-bottom-grid">
        <article className="settings-panel notification-panel"><div className="settings-panel-title">♟ &nbsp;Notification Settings</div>{[['security_alerts','Security Alerts','Receive alerts for critical security events'],['risk_reports','Risk Reports','Get periodic risk analysis reports'],['policy_changes','Policy Updates','Receive updates about system changes'],['audit_logs','Audit Logs','Get notified about important audit events']].map(([key, title, description]) => <div className="setting-row compact" key={key}><span className="setting-row-icon">♟</span><div><strong>{title}</strong><small>{description}</small></div><button type="button" className={`switch ${form[key as keyof typeof form] ? 'on' : ''}`} onClick={() => toggle(key as keyof typeof form)}><i /></button></div>)}<button className="primary-button" type="button" onClick={() => void save()}>♧ &nbsp;Save Notification Preferences</button></article>
        <article className="settings-panel appearance-panel"><div className="settings-panel-title">◉ &nbsp;Appearance Settings</div><label>Theme<div className="theme-buttons">{[['light','☼ Light'],['dark','☾ Dark'],['system','▣ Auto']].map(([value,label]) => <button type="button" className={form.theme === value ? 'selected' : ''} key={value} onClick={() => setField('theme', value)}>{label}</button>)}</div></label><label>Sidebar Style<div className="theme-buttons"><button type="button" className={form.sidebar === 'Default' ? 'selected' : ''} onClick={() => setField('sidebar','Default')}>Default</button><button type="button" onClick={() => setField('sidebar','Compact')}>Compact</button></div></label><label>Dashboard Layout<div className="theme-buttons"><button type="button" className={form.dashboard_layout === 'Standard' ? 'selected' : ''} onClick={() => setField('dashboard_layout','Standard')}>Standard</button><button type="button" onClick={() => setField('dashboard_layout','Compact')}>Compact</button></div></label><label>Color Scheme<div className="color-swatches">{['blue','teal','purple','orange','red'].map((color) => <button type="button" className={`${color} ${form.color === color ? 'selected' : ''}`} key={color} onClick={() => setField('color', color)} />)}</div></label><button className="primary-button apply-theme" type="button" onClick={() => void save()}>✎ &nbsp;Apply Theme</button></article>
        <article className="settings-panel system-panel"><div className="settings-panel-title">ⓘ &nbsp;System Information</div><p>Application Version <b>v1.0.0</b></p><p>Frontend Version <b>v2.0.0</b></p><p>Backend Version <b>v1.0.0</b></p><p>Database <strong>● Connected</strong></p><p>System Uptime <b>7d 14h 32m</b></p><p>Last Backup <b>Nov 4, 2026 · 14:30</b></p><button className="primary-button" type="button" onClick={() => setStatus('System logs are available through the Reports page.')}>⇩ &nbsp;Download Logs</button></article>
      </section>
      {status && <div className="success-banner">{status}</div>}
    </div>
  )
}

function AccessDeniedPage() {
  return (
    <div className="denied-page">
      <div className="denied-box">
        <div className="alert-icon">!</div>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this resource.</p>
        <button className="primary-button" type="button" onClick={() => window.history.back()}>
          Go Back
        </button>
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-box">
        <div className="alert-icon">404</div>
        <h2>Page Not Found</h2>
        <p>The page you requested does not exist or was removed.</p>
        <button className="primary-button" type="button" onClick={() => window.history.back()}>
          Go Back
        </button>
      </div>
    </div>
  )
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  tokenOverride?: string,
): Promise<T> {
  const token = tokenOverride ?? getStoredToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    let message = `Request failed with status ${response.status}`
    if (body.detail) message = Array.isArray(body.detail) ? body.detail.map((d) => d[0]).join(', ') : body.detail
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export default App