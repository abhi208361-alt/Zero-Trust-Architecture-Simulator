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
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123!')
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
          <button className="tiny-button" type="button">
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
          <button className="tiny-button" type="button">
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
          <button className="tiny-button" type="button">
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
          <button className="tiny-button" type="button">
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
          <button className="tiny-button" type="button">
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
          <button className="tiny-button" type="button">
            Ask
          </button>
        </div>

        <div className="assistant-box">
          <p>What are the main policy violations in the current environment?</p>
          <button className="primary-button small" type="button">
            Run analysis
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Documentation</span>
          <button className="tiny-button" type="button">
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
          <button className="tiny-button" type="button">
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
            <input placeholder="Username" defaultValue="admin" />
            <input type="password" placeholder="Password" defaultValue="admin123!" />
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
        <input placeholder="Search" />
        <select>
          <option>All roles</option>
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
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>
                  <span className={user.is_active ? 'status success' : 'status danger'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className="tiny-button" type="button">
                    Edit
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

function NetworkMapPage() {
  return (
    <div className="page-card">
      <h2>Network Map</h2>
      <div className="network-diagram large">
        <div className="node primary">Users</div>
        <div className="node">Gateway</div>
        <div className="node">Policy</div>
        <div className="node">Analytics</div>
        <div className="node">Identity</div>
        <div className="node">Audit</div>
      </div>
    </div>
  )
}

function ReportsPage({ token }: { token: string }) {
  const [reportStatus, setReportStatus] = useState('')

  const downloadCsv = async () => {
    try {
      await apiFetch('/reports/csv', { method: 'GET' }, token)
    } catch (e) {
      setErrorMessage((e as Error).message)
    }
  }

  const downloadPdf = async () => {
    try {
      await apiFetch('/reports/pdf', { method: 'GET' }, token)
    } catch (e) {
      setErrorMessage((e as Error).message)
    }
  }

  function setErrorMessage(message: string) {
    setReportStatus(message)
  }

  return (
    <div className="page-card">
      <h2>Reports</h2>

      <div className="report-grid">
        <label>
          Report Type
          <select>
            <option>Access Summary</option>
            <option>Security Review</option>
            <option>Risk Snapshot</option>
          </select>
        </label>

        <label>
          Start Date
          <input type="date" />
        </label>

        <label>
          End Date
          <input type="date" />
        </label>
      </div>

      <div className="toolbar">
        <button className="primary-button" type="button" onClick={downloadCsv}>
          Download CSV
        </button>
        <button className="ghost-button" type="button" onClick={downloadPdf}>
          Download PDF
        </button>
      </div>

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

  return (
    <div className="page-card">
      <h2>Risk Analysis</h2>

      <div className="stats-grid">
        <div>
          <span>Total Risk</span>
          <strong>{data?.overall_risk_score ?? 72}</strong>
        </div>
        <div>
          <span>Critical</span>
          <strong>{data?.critical_count ?? 8}</strong>
        </div>
        <div>
          <span>High</span>
          <strong>{data?.high_count ?? 12}</strong>
        </div>
        <div>
          <span>Low</span>
          <strong>{data?.low_count ?? 24}</strong>
        </div>
      </div>
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
  return (
    <div className="page-card">
      <h2>Security Investigations</h2>

      <table className="data-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Severity</th>
            <th>Owner</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sample investigation</td>
            <td>High</td>
            <td>Admin</td>
            <td><span className="status danger">Open</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function AssistantPage({ token }: { token: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')

  return (
    <div className="page-card">
      <h2>AI Assistant</h2>

      <div className="chat-box">
        {messages.length === 0 && (
          <div className="empty-chat">
            Ask a security question about access policy, audit logs, or zero-trust posture.
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-row ${msg.role === 'assistant' ? 'assistant' : 'user'}`}>
            <div className="chat-bubble">
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI assistant..."
        />
        <button className="primary-button" type="button">
          Send
        </button>
      </div>
    </div>
  )
}

function DocumentationPage({ token }: { token: string }) {
  return (
    <div className="page-card">
      <h2>Documentation</h2>
      <div className="doc-list">
        <div className="doc-item">
          <h3>Overview</h3>
          <p>Zero Trust Architecture Simulator documentation and architecture overview.</p>
        </div>
        <div className="doc-item">
          <h3>Authentication</h3>
          <p>Authentication is enforced using JWT tokens and RBAC checks.</p>
        </div>
        <div className="doc-item">
          <h3>Policies</h3>
          <p>Access is governed by RBAC and device + risk policy controls.</p>
        </div>
      </div>
    </div>
  )
}

function SettingsPage({ token }: { token: string }) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    theme: 'dark',
  })

  return (
    <div className="page-card">
      <h2>Settings</h2>

      <div className="settings-grid">
        <label>
          Full Name
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>

        <label>
          Email
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>

        <label>
          Password
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>

        <label>
          Confirm Password
          <input
            type="password"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
          />
        </label>

        <label>
          Theme
          <select value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </label>
      </div>
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