import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { hrefFor } from '../shell/useRoute.ts'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import { ClassForm, type ClassValues } from './ClassForm.tsx'
import { formatDays } from './days.ts'

export function ClassesPanel({ gymId }: { gymId: Id<'gyms'> }) {
  const classes = useQuery(api.classes.listByGym, { gymId })
  const create = useMutation(api.classes.create)
  const { run, pending, error, clearError } = useRun()
  const [adding, setAdding] = useState(false)

  const onCreate = async (values: ClassValues) => {
    if ((await run(() => create({ gymId, ...values }))).ok) setAdding(false)
  }

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>Classes</h2>
        {!adding && (
          <button type="button" className={ui.btnPrimary} onClick={() => setAdding(true)}>
            New class
          </button>
        )}
      </div>
      <ErrorBanner error={error} onDismiss={clearError} />
      {adding && (
        <ClassForm
          gymId={gymId}
          pending={pending}
          submitLabel="Create class"
          onSubmit={(v) => void onCreate(v)}
          onCancel={() => setAdding(false)}
        />
      )}
      {classes === undefined ? (
        <p className={ui.empty}>Loading classes…</p>
      ) : classes.length === 0 ? (
        <p className={ui.empty}>No classes yet. Create one like “6 AM, Mon–Fri”.</p>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Class</th>
                <th>Days</th>
                <th>Coach</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c._id}>
                  <td>
                    <a href={hrefFor({ name: 'class', id: c._id })}>{c.name}</a>
                    <div className={ui.muted}>
                      {c.startTime}
                      {c.durationMin ? ` · ${c.durationMin} min` : ''}
                    </div>
                  </td>
                  <td>{formatDays(c.daysOfWeek)}</td>
                  <td>{c.coachName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
