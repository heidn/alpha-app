import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'

type Exercise = { _id: Id<'exercises'>; name: string }

// Replace a junk or duplicate exercise with another everywhere, then delete it.
export function MergeExercise({ from, onDone }: { from: Exercise; onDone: () => void }) {
  const exercises = useQuery(api.library.listExercises, {})
  const merge = useMutation(api.library.mergeExercise)
  const [into, setInto] = useState<Id<'exercises'> | ''>('')
  const { run, pending, error, clearError } = useRun()
  const target = exercises?.find((e) => e._id === into)

  const onMerge = async () => {
    if (!target) return
    const ok = window.confirm(
      `Replace “${from.name}” with “${target.name}” in every workout and result, ` +
        `then delete “${from.name}”?`,
    )
    if (!ok) return
    const r = await run(async () => {
      let step: { phase: 'workouts' | 'logs'; cursor: string | null } = {
        phase: 'workouts',
        cursor: null,
      }
      for (let i = 0; i < 500; i++) {
        const next = await merge({ fromId: from._id, intoId: target._id, ...step })
        if (next.done) return
        step = next
      }
      throw new ConvexError('Still merging: press Merge again')
    })
    if (r.ok) onDone()
  }

  return (
    <section className={ui.card}>
      <div className={ui.form}>
        <label className={ui.field}>
          Merge “{from.name}” into
          <select value={into} onChange={(e) => setInto(e.target.value as Id<'exercises'>)}>
            <option value="">Choose an exercise…</option>
            {exercises
              ?.filter((e) => e._id !== from._id)
              .map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
          </select>
        </label>
        <ErrorBanner error={error} onDismiss={clearError} />
        <div className={ui.formActions}>
          <button type="button" className={ui.btn} disabled={pending} onClick={onDone}>
            Cancel
          </button>
          <button
            type="button"
            className={ui.btnPrimary}
            disabled={!target || pending}
            title={!target ? 'Choose an exercise first' : undefined}
            onClick={() => void onMerge()}
          >
            {pending ? 'Merging…' : 'Merge'}
          </button>
        </div>
      </div>
    </section>
  )
}
