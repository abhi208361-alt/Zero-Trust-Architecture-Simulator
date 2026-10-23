type LandingPageProps = {
  onNavigate: (page: 'login' | 'dashboard') => void
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const principles = [
    'Continuous verification for every user and device',
    'Least-privilege access with risk-based checks',
    'Default-deny policy enforcement and auditability',
  ]

  const capabilities = [
    'Identity-aware access simulation',
    'RBAC and policy enforcement',
    'Audit logs and live compliance summaries',
    'Risk analysis and policy tuning',
  ]

  return (
    <div className="landing-page">
      <section className="hero panel">
        <div>
          <span className="eyebrow">Zero Trust Architecture Simulator</span>
          <h1>Verify identity. Validate trust. Enforce least privilege.</h1>
          <p>
            Explore a local simulation of zero-trust access enforcement, role-based controls, policy review,
            and security telemetry with an admin-ready control plane.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => onNavigate('login')}>Login to console</button>
            <button className="secondary" onClick={() => onNavigate('dashboard')}>Preview dashboard</button>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card panel">
          <span className="stat-label">Access decisions</span>
          <strong>ALLOW / DENY</strong>
          <small>Deterministic policy evaluation</small>
        </article>
        <article className="stat-card panel">
          <span className="stat-label">Identity checks</span>
          <strong>JWT + RBAC</strong>
          <small>Validated tokens and roles</small>
        </article>
        <article className="stat-card panel">
          <span className="stat-label">Policy posture</span>
          <strong>Default deny</strong>
          <small>Risk threshold enforcement</small>
        </article>
      </section>

      <section className="info-grid">
        <article className="panel">
          <h2>Zero Trust principles</h2>
          <ul>
            {principles.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <h2>Built for security teams</h2>
          <ul>
            {capabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}