import type { RbacMatrix, UserRecord } from '../types'

type NetworkMapPageProps = {
  users: UserRecord[]
  matrix: RbacMatrix | null
}

export function NetworkMapPage({ users, matrix }: NetworkMapPageProps) {
  const roles = Object.entries(matrix?.role_permissions ?? {})

  return (
    <div className="page-stack">
      <section className="grid-two">
        <article className="panel">
          <h2>Identity map</h2>
          <div className="list-stack">
            {users.map((user) => (
              <div className="split-row" key={user.id}>
                <span>{user.username}</span>
                <strong>{user.role}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Resource sensitivity</h2>
          <div className="list-stack">
            {matrix ? Object.entries(matrix.resource_sensitivity).map(([resource, level]) => (
              <div className="split-row" key={resource}>
                <span>{resource}</span>
                <strong>{level}</strong>
              </div>
            )) : <div>No matrix loaded.</div>}
          </div>
        </article>
      </section>

      <section className="panel">
        <h2>Role-to-permission map</h2>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Permissions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(([role, permissions]) => (
              <tr key={role}>
                <td>{role}</td>
                <td>{permissions.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}