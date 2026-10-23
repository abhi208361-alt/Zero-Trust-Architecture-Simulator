import { useState } from 'react'
import type { PolicyConfig } from '../types'

type SecurityRulesPageProps = {
  config: PolicyConfig | null
  userRole: string
  onSave: (payload: PolicyConfig) => Promise<void>
}

export function SecurityRulesPage({ config, userRole, onSave }: SecurityRulesPageProps) {
  const [draft, setDraft] = useState<PolicyConfig | null>(config)

  if (!config || !draft) {
    return <div className="panel">Loading policy configuration...</div>
  }

  const save = async () => {
    await onSave(draft)
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>Security rules</h2>
        <p className="muted">Access to policy management is restricted to administrators.</p>
        <div className="form-grid">
          <label>
            Risk threshold
            <input
              type="number"
              value={draft.risk_threshold}
              onChange={(event) => setDraft({ ...draft, risk_threshold: Number(event.target.value) })}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={draft.require_trusted_device_for_high_sensitivity}
              onChange={(event) => setDraft({ ...draft, require_trusted_device_for_high_sensitivity: event.target.checked })}
            />
            Trusted device required for high-sensitivity resources
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={draft.require_mfa_for_high_sensitivity}
              onChange={(event) => setDraft({ ...draft, require_mfa_for_high_sensitivity: event.target.checked })}
            />
            MFA required for high-sensitivity resources
          </label>
          <button className="primary" type="button" onClick={save} disabled={userRole !== 'administrator'}>
            {userRole === 'administrator' ? 'Save rules' : 'Administrator only'}
          </button>
        </div>
      </section>
    </div>
  )
}