import { useEffect, useState } from 'react'
import type { UserRecord } from '../types'

type SettingsPageProps = {
  user: UserRecord | null
}

export function SettingsPage({ user }: SettingsPageProps) {
  const [theme, setTheme] = useState('dark')
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    const storedTheme = localStorage.getItem('zt-theme')
    const storedNotifications = localStorage.getItem('zt-notifications')
    if (storedTheme) setTheme(storedTheme)
    if (storedNotifications) setNotifications(storedNotifications === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('zt-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('zt-notifications', String(notifications))
  }, [notifications])

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>Profile settings</h2>
        <div className="form-grid">
          <label>
            Full name
            <input value={user?.full_name ?? ''} readOnly />
          </label>
          <label>
            Username
            <input value={user?.username ?? ''} readOnly />
          </label>
          <label>
            Email
            <input value={user?.email ?? ''} readOnly />
          </label>
          <label>
            Interface theme
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} />
            Security notifications
          </label>
        </div>
      </section>
    </div>
  )
}