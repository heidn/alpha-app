import { useMutation, usePaginatedQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ROLES, type Role } from '../../../convex/roles'

export function AdminPage() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.listUsers,
    {},
    { initialNumItems: 50 },
  )
  const setRole = useMutation(api.admin.setRole)
  const [error, setError] = useState<string | null>(null)

  const onChange = async (userId: Id<'users'>, role: Role) => {
    setError(null)
    try {
      await setRole({ userId, role })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (status === 'LoadingFirstPage') return <p>Loading users…</p>

  return (
    <section>
      <h2>Users</h2>
      {error && <p role="alert">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {results.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email ?? '—'}</td>
              <td>
                <select
                  value={u.role}
                  onChange={(e) => void onChange(u._id, e.target.value as Role)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {status === 'CanLoadMore' && <button onClick={() => loadMore(50)}>Load more</button>}
    </section>
  )
}
