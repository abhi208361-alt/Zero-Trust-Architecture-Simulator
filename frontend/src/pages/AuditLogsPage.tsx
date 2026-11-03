import { useEffect, useState } from 'react'

type AuditRow = {
  id: number
  timestamp: string
  user: string
  resource: string
  decision: string
  reason: string
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditRow[]>([])
  const [decision, setDecision] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('zta_token') ?? ''
        const query = decision ? `?decision=${decision}` : ''
        const response = await fetch(`http://127.0.0.1:8000/api/v1/audit/logs${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error('Audit logs unavailable')
        setLogs(await response.json())
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Audit logs unavailable')
      }
    }
    void load()
  }, [decision])

  const filtered = logs.filter((log) =>
    [log.user, log.resource, log.decision, log.reason].join(' ').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="page-stack">
      <section className="page-header"><div className="eyebrow">Monitoring</div><h2>Audit Log Monitor</h2></section>
      {error && <div className="error-box">{error}</div>}
      <div className="panel-box"><select value={decision} onChange={(event) => setDecision(event.target.value)}><option value="">All decisions</option><option value="allow">Allow</option><option value="deny">Deny</option></select><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search logs" /></div>
      <div className="panel-box"><table className="data-table"><thead><tr><th>Time</th><th>Actor</th><th>Resource</th><th>Result</th><th>Reason</th></tr></thead><tbody>
        {filtered.map((log) => <tr key={log.id}><td>{log.timestamp}</td><td>{log.user}</td><td>{log.resource}</td><td>{log.decision}</td><td>{log.reason}</td></tr>)}
      </tbody></table></div>
    </div>
  )
}
