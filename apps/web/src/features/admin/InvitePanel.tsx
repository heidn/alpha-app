import { useMutation, useQuery } from 'convex/react'
import { useState, type FormEvent } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Doc, Id } from '../../../../../convex/_generated/dataModel'
import { ROLES, type Role } from '../../../../../convex/roles'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import { RoleBadge } from './RoleBadge.tsx'
import { ROLE_LABEL } from './roleLabel.ts'

const STATUS_LABEL: Record<Doc<'userInvites'>['status'], string> = {
  sending: 'Sending…',
  sent: 'Invite sent',
  hasAccount: 'Has an account — role applies at next sign-in',
  failed: 'Failed',
}

export function InvitePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invites = useQuery(api.invites.list)
  const invite = useMutation(api.invites.invite)
  const resend = useMutation(api.invites.resend)
  const revoke = useMutation(api.invites.revoke)
  const { run, pending, error, clearError } = useRun()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('athlete')
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<Id<'userInvites'> | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setNotice(null)
    const r = await run(() => invite({ email, role }))
    if (r.ok) {
      setNotice(`${r.value === 'resent' ? 'Invite re-sent' : 'Invite sent'} to ${email.trim()} as ${ROLE_LABEL[role]}.`)
      setEmail('')
    }
  }

  const act = async (id: Id<'userInvites'>, fn: () => Promise<unknown>) => {
    setBusy(id)
    await run(fn)
    setBusy(null)
  }

  return (
    <>
      <ErrorBanner error={error} onDismiss={clearError} />

      {open && (
        <section className={ui.card}>
          <div className={ui.cardHead}>
            <h2>Add user</h2>
          </div>
          <form className={ui.form} onSubmit={(e) => void onSubmit(e)}>
            <p className={ui.muted}>
              They get an email from Clerk to finish sign-up. The role applies when they first sign in.
            </p>
            <div className={ui.row}>
              <label className={ui.field}>
                Email
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className={ui.field}>
                Role
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {notice && (
              <p className={ui.muted} role="status">
                {notice}
              </p>
            )}
            <div className={ui.formActions}>
              <button type="button" className={ui.btn} onClick={onClose}>
                Done
              </button>
              <button type="submit" className={ui.btnPrimary} disabled={pending || !email.trim()}>
                {pending ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </form>
        </section>
      )}

      {invites && invites.length > 0 && (
        <section className={ui.card}>
          <div className={ui.cardHead}>
            <h2>Pending invites</h2>
          </div>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i._id}>
                    <td>{i.email}</td>
                    <td>
                      <RoleBadge role={i.role} />
                    </td>
                    <td className={ui.muted}>
                      {STATUS_LABEL[i.status]}
                      {i.status === 'failed' && i.error && `: ${i.error}`}
                    </td>
                    <td className={ui.actions}>
                      <button
                        type="button"
                        className={`${ui.btn} ${ui.btnSmall}`}
                        disabled={busy === i._id || i.status === 'sending'}
                        title={i.status === 'sending' ? 'Still sending' : undefined}
                        onClick={() => void act(i._id, () => resend({ inviteId: i._id }))}
                      >
                        Resend
                      </button>{' '}
                      <button
                        type="button"
                        className={`${ui.btnDanger} ${ui.btnSmall}`}
                        disabled={busy === i._id}
                        onClick={() => void act(i._id, () => revoke({ inviteId: i._id }))}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
