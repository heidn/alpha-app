import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { RoleBadge } from '../admin/RoleBadge.tsx'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'

export function StaffPanel({ gymId, isAdmin }: { gymId: Id<'gyms'>; isAdmin: boolean }) {
  const staff = useQuery(api.gyms.staff, { gymId })
  const candidates = useQuery(api.gyms.staffCandidates, isAdmin ? {} : 'skip')
  const addStaff = useMutation(api.gyms.addStaff)
  const removeStaff = useMutation(api.gyms.removeStaff)
  const { run, pending, error, clearError } = useRun()
  const [pick, setPick] = useState('')

  const staffIds = new Set(staff?.map((s) => s._id))
  const options = candidates?.filter((c) => !staffIds.has(c._id)) ?? []

  const onAdd = async () => {
    const userId = options.find((o) => o._id === pick)?._id
    if (!userId) return
    if ((await run(() => addStaff({ gymId, userId }))).ok) setPick('')
  }

  return (
    <section className={ui.card}>
      <ErrorBanner error={error} onDismiss={clearError} />
      {isAdmin && (
        <div className={ui.cardHead}>
          <label className={ui.field}>
            <span className="visually-hidden">Coach to add</span>
            <select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">
                {options.length ? 'Choose a coach…' : 'No other coaches. Set roles on Users.'}
              </option>
              {options.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.email ? `${o.name} (${o.email})` : o.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={ui.btnPrimary}
            disabled={!pick || pending}
            onClick={() => void onAdd()}
          >
            Add staff
          </button>
        </div>
      )}
      {staff === undefined ? (
        <p className={ui.empty}>Loading staff…</p>
      ) : staff.length === 0 ? (
        <p className={ui.empty}>No staff yet. Add a coach to run classes here.</p>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                {isAdmin && (
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s._id}>
                  <td>
                    <div>{s.name}</div>
                    <div className={ui.muted}>{s.email ?? 'No email'}</div>
                  </td>
                  <td>
                    <RoleBadge role={s.role} />
                  </td>
                  {isAdmin && (
                    <td className={ui.actions}>
                      <button
                        type="button"
                        className={`${ui.btnDanger} ${ui.btnSmall}`}
                        disabled={pending}
                        onClick={() => void run(() => removeStaff({ gymId, userId: s._id }))}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
