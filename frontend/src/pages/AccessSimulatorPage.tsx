import { useMemo, useState } from 'react'
import type { PolicyDecision, UserRecord } from '../types'

type AccessSimulatorPageProps = {
  users: UserRecord[]
  onEvaluate: (payload: {
    username: string
    resource: string
    action: string
    simulated_device_trusted: boolean
    simulated_mfa_passed: boolean
    simulated_risk_score: number
  }) => Promise<PolicyDecision>
}

export function AccessSimulatorPage({ users, onEvaluate }: AccessSimulatorPageProps) {
  const [result, setResult] = useState<PolicyDecision | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const defaultUser = useMemo(() => users[0]?.username ?? 'viewer', [users])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const payload = {
      username: String(formData.get('username') ?? defaultUser),
      resource: String(formData.get('resource') ?? 'resources/public'),
      action: String(formData.get('action') ?? 'read'),
      simulated_device_trusted: formData.get('deviceTrusted') === 'on',
      simulated_mfa_passed: formData.get('mfaPassed') === 'on',
      simulated_risk_score: Number(formData.get('riskScore') ?? 0),
    }

    try {
      const decision = await onEvaluate(payload)
      setResult(decision)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Evaluation failed')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>Access simulation</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Principal
            <select name="username" defaultValue={defaultUser}>
              {users.map((user) => (
                <option key={user.id} value={user.username}>{user.username}</option>
              ))}
            </select>
          </label>
          <label>
            Resource
            <select name="resource" defaultValue="resources/public">
              <option value="resources/public">resources/public</option>
              <option value="resources/security-events">resources/security-events</option>
              <option value="resources/admin">resources/admin</option>
              <option value="audit">audit</option>
            </select>
          </label>
          <label>
            Action
            <select name="action" defaultValue="read">
              <option value="read">read</option>
              <option value="manage">manage</option>
            </select>
          </label>
          <label>
            Risk score
            <input name="riskScore" type="number" min={0} max={100} defaultValue={15} />
          </label>
          <label className="checkbox-row">
            <input name="deviceTrusted" type="checkbox" defaultChecked />
            Trusted device
          </label>
          <label className="checkbox-row">
            <input name="mfaPassed" type="checkbox" defaultChecked />
            MFA completed
          </label>
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Evaluating...' : 'Evaluate access'}
          </button>
        </form>
        {error ? <div className="message error">{error}</div> : null}
      </section>

      {result ? (
        <section className="panel result-box">
          <h2>Decision outcome</h2>
          <div className={`status-badge ${result.decision === 'allow' ? 'allow' : 'deny'}`}>
            {result.decision.toUpperCase()}
          </div>
          <dl className="decision-details">
            <div><dt>Reason</dt><dd>{result.reason}</dd></div>
            <div><dt>Policy</dt><dd>{result.resource}</dd></div>
            <div><dt>Timestamp</dt><dd>{new Date(result.timestamp).toLocaleString()}</dd></div>
            <div><dt>Correlation ID</dt><dd>{result.correlation_id}</dd></div>
          </dl>
          <ul className="check-list">
            {result.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}