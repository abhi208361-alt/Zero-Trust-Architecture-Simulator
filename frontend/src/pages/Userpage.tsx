import { useEffect, useState } from 'react'

type UserRow = {
  id: number
  username: string
  full_name: string
  email: string
  role: string
  is_active: boolean
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('zta_token') ?? ''
      const response = await fetch('http://127.0.0.1:8000/api/v1/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Unable to load users')
      setUsers(await response.json())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load users')
    }
  }

  useEffect(() => {
    void fetchUsers()
  }, [])

  const update = async (id: number, patch: Partial<UserRow>) => {
    const token = localStorage.getItem('zta_token') ?? ''
    const response = await fetch(`http://127.0.0.1:8000/api/v1/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    })
    if (!response.ok) throw new Error((await response.json()).detail ?? 'User update failed')
    await fetchUsers()
  }

  const filtered = users.filter((user) =>
    [user.username, user.full_name, user.email].join(' ').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="page-stack">
      <section className="page-header"><div className="eyebrow">Administration</div><h2>User Management</h2></section>
      {error && <div className="error-box">{error}</div>}
      <div className="panel-box"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" /></div>
      <div className="panel-box">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{filtered.map((user) => (
            <tr key={user.id}>
              <td>{user.full_name}</td><td>{user.username}</td><td>{user.email}</td>
              <td><select value={user.role} onChange={(event) => void update(user.id, { role: event.target.value })}>
                <option value="viewer">viewer</option><option value="analyst">analyst</option><option value="administrator">administrator</option>
              </select></td>
              <td>{user.is_active ? 'Active' : 'Disabled'}</td>
              <td><button className="primary-btn" onClick={() => void update(user.id, { is_active: !user.is_active })}>{user.is_active ? 'Disable' : 'Enable'}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
