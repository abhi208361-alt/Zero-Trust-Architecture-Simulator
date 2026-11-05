import { FormEvent, useEffect, useMemo, useState } from 'react'
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

type AuthResponse = {
  access_token: string
  token_type: string
  expires_at: string
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

function App() {
  const [token, setToken] = useState<string>(() => getStoredToken())
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser())
  const [loadingUser, setLoadingUser] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const storedTheme = localStorage.getItem('zt-theme') ?? currentUser?.theme ?? 'system'
    const resolved = storedTheme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : storedTheme
    document.documentElement.dataset.theme = resolved
    document.documentElement.dataset.color = localStorage.getItem('zt-color') ?? 'blue'
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

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const result = await apiFetch('/dashboard/metrics', { method: 'GET' }, token)
        setMetrics(result)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  return (
    <div className="content-grid">
      <div className="panel">
        <div className="panel-header">
          <span>Network Map</span>
          <button className="tiny-button" type="button" onClick={() => navigate('/network-map')}>
            Live
          </button>
        </div>

        <div className="network-diagram">
          <div className="node primary">Users</div>
          <div className="node">Gateway</div>
          <div className="node">Policy</div>
          <div className="node">Analytics</div>
          <div className="node">Identity</div>
          <div className="node">Audit</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Reports</span>
          <button className="tiny-button" type="button" onClick={() => navigate('/reports')}>
            Generate
          </button>
        </div>
        <ul className="stack-list">
          {['Access Report', 'Audit Log', 'Policy Review', 'Risk Trends'].map((item) => (
            <li key={item} className="stack-row">
              <span>{item}</span>
              <span className="status success">{item.includes('Risk') ? 'Draft' : 'Ready'}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Risk Analysis</span>
          <button className="tiny-button" type="button" onClick={() => navigate('/risk-analysis')}>
            View
          </button>
        </div>

        <div className="risk-balance">
          <div className="risk-circle">
            <strong>{metrics?.denied_requests ?? 72}</strong>
            <small>Risk</small>
          </div>
          <div className="risk-circle alt">
            <strong>{metrics?.allowed_requests ?? 128}</strong>
            <small>Safe</small>
          </div>
        </div>

        <div className="bars-group">
          <span style={{ height: '56%' }} />
          <span style={{ height: '72%' }} />
          <span style={{ height: '88%' }} />
          <span style={{ height: '48%' }} />
          <span style={{ height: '68%' }} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Security Testing</span>
          <button className="tiny-button" type="button" onClick={() => navigate('/security-testing')}>
            Run
          </button>
        </div>
        <ul className="stack-list">
          <li className="stack-row">
            <span>Auth bypass</span>
            <span className="status warn">Queued</span>
          </li>
          <li className="stack-row">
            <span>Privilege escalation</span>
            <span className="status warn">Queued</span>
          </li>
          <li className="stack-row">
            <span>Token replay</span>
            <span className="status warn">Queued</span>
          </li>
          <li className="stack-row">
            <span>Shadow access</span>
            <span className="status warn">Queued</span>
          </li>
        </ul>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Investigations</span>
          <button className="tiny-button" type="button" onClick={() => navigate('/investigations')}>
            Open
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unusual access pattern</td>
              <td><span className="status warn">Open</span></td>
            </tr>
            <tr>
              <td>Privilege drift</td>
              <td><span className="status danger">High</span></td>
            </tr>
            <tr>
              <td>Token reuse</td>
              <td><span className="status success">Closed</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>AI Assistant</span>
          <button className="tiny-button" type="button" onClick={() => navigate('/assistant')}>
            Ask
          </button>
        </div>

        <div className="assistant-box">
          <p>What are the main policy violations in the current environment?</p>
          <button className="primary-button small" type="button" onClick={() => navigate('/assistant')}>
            Run analysis
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Documentation</span>
          <button className="tiny-button" type="button" onClick={() => navigate('/documentation')}>
            Open
          </button>
        </div>

        <div className="doc-grid">
          <span>Policy Overview</span>
          <span>Zero Trust Design</span>
          <span>Access Control</span>
          <span>Risk Components</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Settings</span>
          <button className="tiny-button" type="button" onClick={() => navigate('/settings')}>
            Update
          </button>
        </div>

        <form className="mini-form" onSubmit={(e) => e.preventDefault()}>
          <label>
            Risk threshold
            <input type="number" defaultValue={70} />
          </label>
          <label className="checkbox-line">
            <input type="checkbox" defaultChecked />
            Trusted device required
          </label>
          <label className="checkbox-line">
            <input type="checkbox" />
            MFA required
          </label>
        </form>
      </div>

      <div className="panel login-panel">
        <div className="panel-header">
          <span>{token ? 'Session Status' : 'Login Page'}</span>
          {!token && <button className="tiny-button" type="button">Secure</button>}
        </div>
        {!token ? (
          <form className="mini-form" onSubmit={(e) => e.preventDefault()}>
            <input placeholder="Username" />
            <input type="password" placeholder="Password" />
            <button type="submit" className="primary-button small">Sign In</button>
          </form>
        ) : (
          <div className="session-box">
            <div className="session-name">{currentUser?.username}</div>
            <div className="session-role">{currentUser?.role}</div>
            <div className="session-copy">Authenticated and monitoring active policy decisions.</div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Registration Page</span>
          <button className="tiny-button" type="button">
            Create
          </button>
        </div>
        <form className="mini-form">
          <input placeholder="Full Name" />
          <input placeholder="Email Address" />
          <input type="password" placeholder="Password" />
          <button className="primary-button small" type="button">Register</button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Access Denied Page</span>
          <button className="tiny-button" type="button">
            Secure
          </button>
        </div>
        <div className="error-box">
          <div className="alert-icon">!</div>
          <h3>Access Denied</h3>
          <p>You do not have permission to access this resource.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Not Found Page</span>
          <button className="tiny-button" type="button">
            Back
          </button>
        </div>
        <div className="empty-box">
          <div className="alert-icon">404</div>
          <h3>Page Not Found</h3>
          <p>The page you requested does not exist or was removed.</p>
        </div>
      </div>
    </div>
  )
}

function AccessSimulatorPage({ token }: { token: string }) {
  const [form, setForm] = useState({
    username: 'viewer',
    resource: 'resources/public',
    action: 'read',
    simulated_device_trusted: true,
    simulated_mfa_passed: false,
    simulated_risk_score: 5,
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

  return (
    <div className="page-card">
      <h2>Access Request Simulator</h2>
      <form className="simulator-form" onSubmit={execute}>
        <div className="two-col">
          <label>
            Username
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>
          <label>
            Resource
            <input value={form.resource} onChange={(e) => setForm({ ...form, resource: e.target.value })} />
          </label>
        </div>

        <div className="two-col">
          <label>
            Action
            <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
              <option value="read">read</option>
              <option value="manage">manage</option>
            </select>
          </label>
          <label>
            Risk Score
            <input
              type="number"
              min={0}
              max={100}
              value={form.simulated_risk_score}
              onChange={(e) => setForm({ ...form, simulated_risk_score: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="two-col">
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={form.simulated_device_trusted}
              onChange={(e) => setForm({ ...form, simulated_device_trusted: e.target.checked })}
            />
            Trusted Device
          </label>

          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={form.simulated_mfa_passed}
              onChange={(e) => setForm({ ...form, simulated_mfa_passed: e.target.checked })}
            />
            MFA Passed
          </label>
        </div>

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Evaluating...' : 'Evaluate Policy'}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {decision && (
        <div className="result-box">
          <pre>{JSON.stringify(decision, null, 2)}</pre>
        </div>
      )}
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

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const result = await apiFetch('/policy/config', { method: 'GET' }, token)
        setConfig(result)
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

  return (
    <div className="page-card">
      <h2>Policy Management</h2>

      <div className="form-grid">
        <label>
          Risk Threshold
          <input
            type="number"
            min={0}
            max={100}
            value={config.risk_threshold}
            onChange={(e) => setConfig({ ...config, risk_threshold: Number(e.target.value) })}
          />
        </label>

        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={config.require_trusted_device_for_high_sensitivity}
            onChange={(e) =>
              setConfig({
                ...config,
                require_trusted_device_for_high_sensitivity: e.target.checked,
              })
            }
          />
          Trusted device required
        </label>

        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={config.require_mfa_for_high_sensitivity}
            onChange={(e) =>
              setConfig({
                ...config,
                require_mfa_for_high_sensitivity: e.target.checked,
              })
            }
          />
          MFA required
        </label>

        <button className="primary-button" onClick={save} type="button">
          Save Policy
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  )
}

function AuditLogsPage({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const result = await apiFetch('/audit/logs', { method: 'GET' }, token)
        setLogs(result)
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
      <h2>Audit Logs</h2>

      <div className="toolbar">
        <select>
          <option>Last 2 hours</option>
          <option>Last 24 hours</option>
          <option>Last 7 days</option>
        </select>
        <input placeholder="Search logs" />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Resource</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={`${log.id ?? index}`}>
                <td>{log.timestamp ?? log.created_at ?? '—'}</td>
                <td>{log.user ?? log.actor ?? '—'}</td>
                <td>{log.resource ?? '—'}</td>
                <td>
                  <span className={log.result === 'allow' ? 'status success' : 'status danger'}>
                    {log.result ?? (log.decision ?? '—')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div className="error-banner">{error}</div>}
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
      const resolvedTheme = form.theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : form.theme
      document.documentElement.dataset.theme = resolvedTheme
      document.documentElement.dataset.color = form.color
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