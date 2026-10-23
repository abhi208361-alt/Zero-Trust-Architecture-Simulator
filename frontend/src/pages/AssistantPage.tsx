import { useMemo, useState } from 'react'
import type { AuditLog, DashboardMetrics } from '../types'

type AssistantPageProps = {
  metrics: DashboardMetrics | null
  logs: AuditLog[]
}

export function AssistantPage({ metrics, logs }: AssistantPageProps) {
  const [query, setQuery] = useState('What is the current risk posture?')

  const answer = useMemo(() => {
    if (!metrics) return 'Load the simulator data to generate an answer.'

    const denied = metrics.denied_requests
    const highRisk = logs.filter((log) => log.result === 'deny' && log.risk_score >= 60).length

    if (query.toLowerCase().includes('risk') || query.toLowerCase().includes('posture')) {
      return `Current risk posture is ${denied > 0 ? 'elevated' : 'stable'}. ${metrics.denied_requests} deny events were recorded, and ${highRisk} deny events had elevated risk scores. Recommended action: review the denied requests and verify trust signals.`
    }

    if (query.toLowerCase().includes('policy')) {
      return 'Policy review should prioritize default-deny enforcement, device trust checks, and MFA rules for high-sensitivity resources. No external AI provider is configured, so this assistant is operating in local rule-based mode.'
    }

    if (query.toLowerCase().includes('audit')) {
      return `The latest audit activity shows ${logs.length} recent logs in scope, with ${metrics.allowed_requests} allowed and ${metrics.denied_requests} denied decisions.`
    }

    return 'The simulator is using a local rule-based security assistant. It evaluates the known metrics and recent audit records to explain policy posture and likely operational issues.'
  }, [logs, metrics, query])

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>Security assistant</h2>
        <label>
          Question
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="assistant-response">
          <strong>Answer</strong>
          <p>{answer}</p>
        </div>
      </section>
    </div>
  )
}