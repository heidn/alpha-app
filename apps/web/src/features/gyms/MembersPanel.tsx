import { usePaginatedQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { RoleBadge } from '../admin/RoleBadge.tsx'
import ui from '../ui/ui.module.css'

const PAGE_SIZE = 50

export function MembersPanel({ gymId }: { gymId: Id<'gyms'> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.gyms.members,
    { gymId },
    { initialNumItems: PAGE_SIZE },
  )
  return (
    <section className={ui.card}>
      {status === 'LoadingFirstPage' ? (
        <p className={ui.empty}>Loading members…</p>
      ) : results.length === 0 ? (
        <p className={ui.empty}>No members yet. Invite athletes from a class.</p>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {results.map((m) => (
                <tr key={m._id}>
                  <td>
                    <div>{m.name}</div>
                    <div className={ui.muted}>{m.email ?? 'No email'}</div>
                  </td>
                  <td>
                    <RoleBadge role={m.role} /> {m.staff && <span className={ui.pill}>Staff</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {status === 'CanLoadMore' && (
        <button type="button" className={ui.more} onClick={() => loadMore(PAGE_SIZE)}>
          Load more
        </button>
      )}
    </section>
  )
}
