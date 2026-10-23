import type { AuditLog, DashboardMetrics } from '../types'

type RiskAnalysisPageProps = {
  metrics: DashboardMetrics | null
  logs: AuditLog[]
}

export function RiskAnalysisPage({ metrics, logs }: RiskAnalysisPageProps) {
  const findings = [
    {
      title: 'Repeated denied access',
      severity: 'medium',
      detail: `${metrics?.denied_requests ?? 0} denied decisions were observed in the simulator dataset.`,
    },
    {
      title: 'High-risk policy triggers',
      severity: 'high',
      detail: `${logs.filter((log) => log.result === 'deny' && log.risk_score >= 60).length} denied events exceeded a 60-point simulated risk threshold.`,
    },
    {
      title: 'Resource sensitivity review',
      severity: 'low',
      detail: 'Review policy thresholds for high-sensitivity resources and verify device trust before granting access.',
    },
  ]

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>Risk analysis</h2>
        <div className="risk-list">
          {findings.map((finding) => (
            <article className="risk-item" key={finding.title}>
              <div className={`severity ${finding.severity}`}>{finding.severity}</div>
              <div>
                <h3>{finding.title}</h3>
                <p>{finding.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}