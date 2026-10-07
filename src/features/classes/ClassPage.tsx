import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { hrefFor } from '../shell/useRoute.ts'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import { ClassForm, type ClassValues } from './ClassForm.tsx'
import { formatDays } from './days.ts'
import { RosterPanel } from './RosterPanel.tsx'

export function ClassPage({ id }: { id: string }) {
  const cls = useQuery(api.classes.get, { classId: id })
  const update = useMutation(api.classes.update)
  const remove = useMutation(api.classes.remove)
  const { run, pending, error, clearError } = useRun()
  const [editing, setEditing] = useState(false)

  if (cls === undefined) return <p className={ui.muted}>Loading class…</p>
  if (cls === null) return <p className={ui.muted}>Class not found.</p>

  const gymHref = hrefFor({ name: 'gym', id: cls.gymId })
  const onSave = async (values: ClassValues) => {
    if ((await run(() => update({ classId: cls._id, ...values }))).ok) setEditing(false)
  }
  const onDelete = async () => {
    if (!window.confirm(`Delete class “${cls.name}”?`)) return
    if ((await run(() => remove({ classId: cls._id }))).ok) window.location.hash = gymHref
  }

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div>
          <a className={ui.crumb} href={gymHref}>
            ← {cls.gymName}
          </a>
          <h1>{cls.name}</h1>
          <p className={ui.sub}>
            {formatDays(cls.daysOfWeek)} · {cls.startTime}
            {cls.durationMin ? ` · ${cls.durationMin} min` : ''} · Coach {cls.coachName}
          </p>
        </div>
        {!editing && (
          <div className={ui.formActions}>
            <button type="button" className={ui.btn} onClick={() => setEditing(true)}>
              Edit class
            </button>
            <button
              type="button"
              className={ui.btnDanger}
              disabled={pending}
              onClick={() => void onDelete()}
            >
              Delete
            </button>
          </div>
        )}
      </header>

      <ErrorBanner error={error} onDismiss={clearError} />

      {editing && (
        <section className={ui.card} aria-label="Edit class">
          <ClassForm
            gymId={cls.gymId}
            initial={cls}
            pending={pending}
            submitLabel="Save"
            onSubmit={(v) => void onSave(v)}
            onCancel={() => setEditing(false)}
          />
        </section>
      )}

      <RosterPanel classId={cls._id} />
    </div>
  )
}
