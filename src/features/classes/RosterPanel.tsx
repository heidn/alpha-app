import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { useState, type FormEvent } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'

const PAGE_SIZE = 50

export function RosterPanel({ classId }: { classId: Id<'classes'> }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.classMembers.roster,
    { classId },
    { initialNumItems: PAGE_SIZE },
  )
  const invites = useQuery(api.classMembers.listInvites, { classId })
  const invite = useMutation(api.classMembers.invite)
  const cancelInvite = useMutation(api.classMembers.cancelInvite)
  const remove = useMutation(api.classMembers.remove)
  const { run, pending, error, clearError } = useRun()
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const onInvite = async (e: FormEvent) => {
    e.preventDefault()
    setNotice(null)
    const r = await run(() => invite({ classId, email }))
    if (!r.ok) return
    setNotice(
      r.value === 'added'
        ? `${email} already has an account and was added.`
        : `Invite saved. ${email} joins when they sign up with that email.`,
    )
    setEmail('')
  }

  return (
    <>
      <section className={ui.card}>
        <form className={ui.cardHead} onSubmit={(e) => void onInvite(e)}>
          <label className={ui.field}>
            <span className="visually-hidden">Athlete email</span>
            <input
              type="email"
              required
              placeholder="athlete@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button type="submit" className={ui.btnPrimary} disabled={pending}>
            Invite to class
          </button>
        </form>
        <ErrorBanner error={error} onDismiss={clearError} />
        {notice && (
          <p className={ui.notice} role="status">
            {notice}
          </p>
        )}
        {invites && invites.length > 0 && (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Pending invite</th>
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i._id}>
                    <td>{i.email}</td>
                    <td className={ui.actions}>
                      <button
                        type="button"
                        className={`${ui.btn} ${ui.btnSmall}`}
                        disabled={pending}
                        onClick={() => void run(() => cancelInvite({ inviteId: i._id }))}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={ui.card}>
        <div className={ui.cardHead}>
          <h2>Athletes</h2>
        </div>
        {status === 'LoadingFirstPage' ? (
          <p className={ui.empty}>Loading athletes…</p>
        ) : results.length === 0 ? (
          <p className={ui.empty}>No athletes yet. Invite them by email above.</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <tbody>
                {results.map((m) => (
                  <tr key={m._id}>
                    <td>
                      <div>{m.name}</div>
                      <div className={ui.muted}>{m.email ?? 'No email'}</div>
                    </td>
                    <td className={ui.actions}>
                      <button
                        type="button"
                        className={`${ui.btnDanger} ${ui.btnSmall}`}
                        disabled={pending}
                        onClick={() => void run(() => remove({ classId, userId: m._id }))}
                      >
                        Remove
                      </button>
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
    </>
  )
}
