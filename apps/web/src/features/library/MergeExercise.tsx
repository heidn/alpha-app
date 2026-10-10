import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useDeferredValue, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { fixedLabel, parseOption, type Fixed } from '../../../../../convex/variants'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import { Modal } from '../ui/Modal.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import { FIXED_UNITS } from '../workouts/testOption.ts'
import styles from './MergeExercise.module.css'

type Exercise = { _id: Id<'exercises'>; name: string }
type Phase = 'workouts' | 'logs'

const PHASE_LABEL: Record<Phase, string> = {
  workouts: 'Updating workouts…',
  logs: 'Updating results…',
}

// Replace a junk or duplicate exercise with another everywhere, then delete it.
// "1000m row" → suggests Row and keeps 1,000 m as the variation on every workout and result.
export function MergeExercise({ from, onDone }: { from: Exercise; onDone: () => void }) {
  const parsed = parseOption(from.name)
  const [search, setSearch] = useState(parsed.fixed ? parsed.name : '')
  const term = useDeferredValue(search.trim())
  const results = useQuery(api.library.listExercises, term ? { search: term } : 'skip')
  const options = results?.filter((e) => e._id !== from._id)
  const [picked, setPicked] = useState<Exercise | null>(null)
  const [fixed, setFixed] = useState<Fixed | undefined>(parsed.fixed)
  const [phase, setPhase] = useState<Phase | null>(null)
  const merge = useMutation(api.library.mergeExercise)
  const { run, pending, error, clearError } = useRun()

  // Until the admin picks one, an exact name match ("row" → Row) is preselected.
  const exact = options?.find((e) => e.name.toLowerCase() === term.toLowerCase())
  const target = picked ?? (parsed.fixed ? exact : undefined) ?? null
  const result = target && (fixed ? `${target.name} · ${fixedLabel(fixed)}` : target.name)

  const onMerge = async () => {
    if (!target) return
    const r = await run(async () => {
      let step: { phase: Phase; cursor: string | null } = { phase: 'workouts', cursor: null }
      for (let i = 0; i < 500; i++) {
        setPhase(step.phase)
        const next = await merge({ fromId: from._id, intoId: target._id, fixed, ...step })
        if (next.done) return
        step = { phase: next.phase, cursor: next.cursor }
      }
      throw new ConvexError('Still merging: press Merge again to finish')
    })
    setPhase(null)
    if (r.ok) onDone()
  }

  return (
    <Modal
      title="Merge exercise"
      onClose={onDone}
      busy={pending}
      footer={
        <>
          {phase && (
            <span className={`${ui.muted} ${styles.progress}`} role="status">
              {PHASE_LABEL[phase]}
            </span>
          )}
          <button type="button" className={ui.btn} disabled={pending} onClick={onDone}>
            Cancel
          </button>
          <button
            type="button"
            className={ui.btnPrimary}
            disabled={!target || pending}
            title={!target ? 'Choose the exercise to keep first' : undefined}
            onClick={() => void onMerge()}
          >
            {pending ? 'Merging…' : 'Merge'}
          </button>
        </>
      }
    >
      <p className={styles.from}>
        <span className={ui.muted}>Remove</span> <strong>{from.name}</strong>
      </p>

      <div className={ui.field}>
        <label htmlFor="merge-into">Keep instead</label>
        <input
          id="merge-into"
          type="search"
          placeholder="Search exercises"
          autoComplete="off"
          value={search}
          disabled={pending}
          onChange={(e) => setSearch(e.target.value)}
        />
        {term && (
          <ul className={styles.results} aria-label="Matching exercises">
            {options === undefined ? (
              <li className={ui.muted}>Searching…</li>
            ) : options.length === 0 ? (
              <li className={ui.muted}>No match. Add it in the list first, then merge.</li>
            ) : (
              options.map((e) => (
                <li key={e._id}>
                  <button
                    type="button"
                    className={styles.result}
                    aria-pressed={target?._id === e._id}
                    disabled={pending}
                    onClick={() => setPicked(e)}
                  >
                    {e.name}
                    {target?._id === e._id && <span aria-hidden="true">✓</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className={ui.field} role="group" aria-labelledby="merge-variation">
        <span id="merge-variation">Keep as variation (optional)</span>
        <span className={styles.hint}>
          The distance, time or rep max “{from.name}” stood for, so its results stay separate
          from other {target?.name ?? 'exercise'} distances.
        </span>
        <div className={styles.amount}>
          <label>
            <span className="visually-hidden">Amount</span>
            <input
              className={ui.input}
              type="number"
              min={0}
              step="any"
              placeholder="none"
              value={fixed?.amount ?? ''}
              disabled={pending}
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
              className={ui.input}
              value={fixed?.unit ?? 'm'}
              disabled={!fixed || pending}
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

      {result && (
        <p className={styles.preview}>
          Every workout and result using <strong>{from.name}</strong> will show{' '}
          <strong>{result}</strong>. Then “{from.name}” is deleted. This can’t be undone.
        </p>
      )}

      <ErrorBanner error={error} onDismiss={clearError} />
    </Modal>
  )
}
