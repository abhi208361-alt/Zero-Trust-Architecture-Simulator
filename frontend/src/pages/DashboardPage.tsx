import type { DashboardMetrics, UserRecord } from '../types'

type DashboardPageProps = {
  metrics: DashboardMetrics | null
  users: UserRecord[]
}

export function DashboardPage({ metrics, users }: DashboardPageProps) {
  if (!metrics) {
    return <div className="panel">Loading dashboard...</div>
  }

  const statCards = [
    { label: 'Total requests', value: metrics.total_access_requests },
    { label: 'Allowed', value: metrics.allowed_requests },
    { label: 'Denied', value: metrics.denied_requests },
    { label: 'Denial %', value: `${metrics.denial_percentage}%` },
  ]

  return (
    <div className="page-stack">
      <section className="stats-grid">
        {statCards.map((card) => (
          <article className="stat-card panel" key={card.label}>
            <span className="stat-label">{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="grid-two">
        <article className="panel">
          <h2>Role distribution</h2>
          <div className="list-stack">
            {Object.entries(metrics.role_distribution).map(([role, count]) => (
              <div key={role} className="split-row">
                <span>{role}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Active identities</h2>
          <div className="list-stack">
            <div className="split-row"><span>Total users</span><strong>{metrics.users_total}</strong></div>
            <div className="split-row"><span>Active</span><strong>{metrics.users_active}</strong></div>
            <div className="split-row"><span>Inactive</span><strong>{Math.max(metrics.users_total - metrics.users_active, 0)}</strong></div>
          </div>
        </article>
      </section>

      <section className="panel">
        <h2>Identity roster</h2>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>{user.is_active ? 'Active' : 'Disabled'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}