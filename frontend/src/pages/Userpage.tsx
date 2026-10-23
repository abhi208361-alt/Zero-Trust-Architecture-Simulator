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

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const token = localStorage.getItem('zta_token')
      const res = await fetch('http://127.0.0.1:8000/api/v1/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Unable to load users')
      const data = await res.json()
      setUsers(data)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function toggleStatus(userId: number, isActive: boolean) {
    try {
      const token = localStorage.getItem('zta_token')
      await fetch(`http://127.0.0.1:8000/api/v1/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !isActive }),
      })
      fetchUsers()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function updateRole(userId: number, role: string) {
    try {
      const token = localStorage.getItem('zta_token')
      await fetch(`http://127.0.0.1:8000/api/v1/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      })
      fetchUsers()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const filteredUsers = users.filter((user) =>
    [user.username, user.full_name, user.email].join(' ').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-stack">
      <section className="page-header">
        <div className="eyebrow">Administration</div>
        <h2>User Management</h2>
      </section>

      {error && <div className="error-box">{error}</div>}

      <div className="panel-box">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users"
          className="search-input"
        />
      </div>

      <div className="panel-box">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                  >
                    <option value="viewer">viewer</option>
                    <option value="analyst">analyst</option>
                    <option value="administrator">administrator</option>
                  </select>
                </td>
                <td>{user.is_active ? 'Active' : 'Disabled'}</td>
                <td>
                  <button className="primary-btn" onClick={() => toggleStatus(user.id, user.is_active)}>
                    {user.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}