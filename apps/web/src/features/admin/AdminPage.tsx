import { useMutation, usePaginatedQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { ROLES, type Role } from '../../../../../convex/roles'
import styles from './AdminPage.module.css'
import { InvitePanel } from './InvitePanel.tsx'
import { RoleBadge } from './RoleBadge.tsx'
import { ROLE_LABEL } from './roleLabel.ts'
import ui from '../ui/ui.module.css'

const PAGE_SIZE = 50

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export function AdminPage({ currentUserId }: { currentUserId: Id<'users'> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.listUsers,
    {},
    { initialNumItems: PAGE_SIZE },
  )
  const setRole = useMutation(api.admin.setRole)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Id<'users'> | null>(null)
  const [saved, setSaved] = useState<Id<'users'> | null>(null)
  const [adding, setAdding] = useState(false)

  const onChange = async (userId: Id<'users'>, role: Role) => {
    setError(null)
    setPending(userId)
    try {
      await setRole({ userId, role })
      setSaved(userId)
      setTimeout(() => setSaved((s) => (s === userId ? null : s)), 1500)
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : 'Something went wrong. Try again.')
    } finally {
      setPending(null)
    }
  }

  const q = search.trim().toLowerCase()
  const rows = q
    ? results.filter((u) => u.name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    : results
  const counts = Object.fromEntries(
    ROLES.map((r) => [r, results.filter((u) => u.role === r).length]),
  ) as Record<Role, number>

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Users</h1>
          <p className={styles.sub}>Assign roles to control what people can see and do.</p>
        </div>
        {!adding && (
          <button type="button" className={ui.btnPrimary} onClick={() => setAdding(true)}>
            Add user
          </button>
        )}
        <ul className={styles.stats} aria-label="Users by role">
          {ROLES.map((r) => (
            <li key={r}>
              <strong>{status === 'LoadingFirstPage' ? '–' : counts[r]}</strong>
              <span>{ROLE_LABEL[r]}s</span>
            </li>
          ))}
        </ul>
      </header>

      {error && (
        <div role="alert" className={styles.alert}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <InvitePanel open={adding} onClose={() => setAdding(false)} />

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <span className="visually-hidden">Search users</span>
            <input
              type="search"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {status === 'LoadingFirstPage' ? (
          <p className={styles.empty}>Loading users…</p>
        ) : rows.length === 0 ? (
          <p className={styles.empty}>{q ? `No users match “${search}”.` : 'No users yet.'}</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>
                    <span className="visually-hidden">Change role</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const isSelf = u._id === currentUserId
                  return (
                    <tr key={u._id}>
                      <td>
                        <div className={styles.user}>
                          <span className={styles.avatar} aria-hidden>
                            {initials(u.name)}
                          </span>
                          <div>
                            <div className={styles.name}>
                              {u.name}
                              {isSelf && <span className={styles.you}>You</span>}
                              {!u.signedIn && <span className={styles.you}>Not signed in yet</span>}
                            </div>
                            <div className={styles.email}>{u.email ?? 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <RoleBadge role={u.role} />
                      </td>
                      <td className={styles.actions}>
                        {saved === u._id && <span className={styles.saved}>Saved</span>}
                        <label>
                          <span className="visually-hidden">Role for {u.name}</span>
                          <select
                            className={styles.select}
                            value={u.role}
                            disabled={isSelf || pending === u._id}
                            title={isSelf ? 'You can’t change your own role' : undefined}
                            onChange={(e) => void onChange(u._id, e.target.value as Role)}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {status === 'CanLoadMore' && (
          <button type="button" className={styles.more} onClick={() => loadMore(PAGE_SIZE)}>
            Load more
          </button>
        )}
      </section>
    </div>
  )
}
