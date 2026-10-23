import { useEffect, useState } from 'react'

type AuditRow = {
  id: number
  created_at: string
  actor_username: string
  event_type: string
  resource: string
  result: string
  reason: string
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditRow[]>([])
  const [range, setRange] = useState<'2h' | '24h' | '7d' | 'all'>('24h')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)

    try {
      const token = localStorage.getItem('zta_token')
      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('page_size', '25')

      if (range === '2h') params.set('since', '2h')
      if (range === '24h') params.set('since', '24h')
      if (range === '7d') params.set('since', '7d')

      const res = await fetch(`http://127.0.0.1:8000/api/v1/audit/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Audit logs unavailable')
      const data = await res.json()
      setLogs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const timer = setInterval(fetchLogs, 15000)
    return () => clearInterval(timer)
  }, [range])

  const filtered = logs.filter((log) =>
    [log.actor_username, log.event_type, log.resource, log.reason].join(' ').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-stack">
      <section className="page-header">
        <div className="eyebrow">Monitoring</div>
        <h2>Audit Log Monitor</h2>
      </section>

      <div className="panel-box">
        <div className="toolbar">
          <select value={range} onChange={(e) => setRange(e.target.value as any)}>
            <option value="2h">Last 2 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="all">All</option>
          </select>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs"
          />
        </div>
      </div>

      <div className="panel-box">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Event</th>
              <th>Resource</th>
              <th>Result</th>
              <th>Reason</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((log) => (
              <tr key={log.id}>
                <td>{log.created_at}</td>
                <td>{log.actor_username}</td>
                <td>{log.event_type}</td>
                <td>{log.resource}</td>
                <td>{log.result}</td>
                <td>{log.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}