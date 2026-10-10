import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import { fixedLabel, parseOption, type Fixed } from '../../../../../convex/variants'
import { FIXED_UNITS } from '../workouts/testOption.ts'

type Exercise = { _id: Id<'exercises'>; name: string }

// Replace a junk or duplicate exercise with another everywhere, then delete it.
export function MergeExercise({ from, onDone }: { from: Exercise; onDone: () => void }) {
  const exercises = useQuery(api.library.listExercises, {})
  const merge = useMutation(api.library.mergeExercise)
  // "1000m row" → suggest Row and keep 1000 m as the variant on every workout and result.
  const parsed = parseOption(from.name)
  const [into, setInto] = useState<Id<'exercises'> | ''>('')
  const [fixed, setFixed] = useState<Fixed | undefined>(parsed.fixed)
  const { run, pending, error, clearError } = useRun()
  const suggested = parsed.fixed
    ? exercises?.find((e) => e.name.toLowerCase() === parsed.name.toLowerCase())
    : undefined
  const target = exercises?.find((e) => e._id === (into || suggested?._id))

  const onMerge = async () => {
    if (!target) return
    const ok = window.confirm(
      `Replace “${from.name}” with “${target.name}”` +
        (fixed ? ` · ${fixedLabel(fixed)}` : '') +
        ` in every workout and result, then delete “${from.name}”?`,
    )
    if (!ok) return
    const r = await run(async () => {
      let step: { phase: 'workouts' | 'logs'; cursor: string | null } = {
        phase: 'workouts',
        cursor: null,
      }
      for (let i = 0; i < 500; i++) {
        const next = await merge({ fromId: from._id, intoId: target._id, fixed, ...step })
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
          <select
            value={target?._id ?? ''}
            onChange={(e) => setInto(e.target.value as Id<'exercises'>)}
          >
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
        <div className={ui.field} role="group" aria-labelledby="merge-variation">
          <span id="merge-variation">Keep as variation (optional)</span>
          <span className={ui.muted}>
            The distance, time or rep max this exercise stood for, e.g. 1000 m for “1000m row”.
          </span>
          <div className={ui.row}>
            <label>
              <span className="visually-hidden">Amount</span>
              <input
                type="number"
                min={0}
                step="any"
                placeholder="none"
                value={fixed?.amount ?? ''}
                onChange={(e) =>
                  setFixed(
                    e.target.value
                      ? { amount: Number(e.target.value), unit: fixed?.unit ?? 'm' }
                      : undefined,
                  )
                }
              />
            </label>
            <label>
              <span className="visually-hidden">Unit</span>
              <select
                value={fixed?.unit ?? 'm'}
                disabled={!fixed}
                title={!fixed ? 'Enter an amount first' : undefined}
                onChange={(e) => {
                  const unit = FIXED_UNITS.find((u) => u.value === e.target.value)?.value
                  if (fixed && unit) setFixed({ ...fixed, unit })
                }}
              >
                {FIXED_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
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
