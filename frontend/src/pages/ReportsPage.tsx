import type { DashboardMetrics, AuditLog } from '../types'

type ReportsPageProps = {
  metrics: DashboardMetrics | null
  logs: AuditLog[]
}

export function ReportsPage({ metrics, logs }: ReportsPageProps) {
  const exportCsv = () => {
    if (!logs.length) return
    const headers = ['timestamp', 'actor', 'resource', 'action', 'result', 'reason']
    const body = logs.map((log) => [
      log.created_at,
      log.actor_username ?? '',
      log.resource,
      log.action,
      log.result,
      log.reason,
    ].join(','))
    const csv = [headers.join(','), ...body].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'zero-trust-report.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-stack">
      <section className="panel report-header">
        <div>
          <h2>Operational report</h2>
          {metrics ? (
            <p>
              {metrics.allowed_requests} allowed and {metrics.denied_requests} denied events recorded.
            </p>
          ) : <p>No metrics available.</p>}
        </div>
        <button className="primary" type="button" onClick={exportCsv}>Export CSV</button>
      </section>
      <section className="grid-two">
        <article className="panel">
          <h3>Access summary</h3>
          <div className="list-stack">
            <div className="split-row"><span>Total</span><strong>{metrics?.total_access_requests ?? 0}</strong></div>
            <div className="split-row"><span>Allowed</span><strong>{metrics?.allowed_requests ?? 0}</strong></div>
            <div className="split-row"><span>Denied</span><strong>{metrics?.denied_requests ?? 0}</strong></div>
          </div>
        </article>
        <article className="panel">
          <h3>Top events</h3>
          <div className="list-stack">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="split-row">
                <span>{log.resource}</span>
                <strong>{log.result}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}