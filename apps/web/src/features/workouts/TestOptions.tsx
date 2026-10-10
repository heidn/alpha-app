import type { ProgramSection } from '../../../../../convex/domain'
import ui from '../ui/ui.module.css'
import { ExercisePicker } from './ExercisePicker.tsx'
import { newKey, removeAt, replaceAt } from './program.ts'
import type { ScoreTypeOption } from './ScoreControl.tsx'
import {
  FIXED_UNITS,
  fixedOf,
  measures,
  optionScore,
  toPrescription,
  type Fixed,
  type FixedUnit,
} from './testOption.ts'
import styles from './WorkoutEditor.module.css'

type Option = ProgramSection['exercises'][number]

const isUnit = (v: string): v is FixedUnit => FIXED_UNITS.some((u) => u.value === v)

type Props = {
  section: ProgramSection
  names: Record<string, string>
  scoreTypes: ScoreTypeOption[]
  logged: Set<string>
  onChange: (s: ProgramSection) => void
  onName: (id: string, name: string) => void
  onError: (msg: string) => void
}

// Athletes pick one option; each option has its own result, board and history.
export function TestOptions({ section: s, names, scoreTypes, logged, ...p }: Props) {
  const setOptions = (exercises: Option[]) => p.onChange({ ...s, exercises })
  const setFixed = (i: number, o: Option, fixed: Fixed | undefined) =>
    setOptions(
      replaceAt(s.exercises, i, {
        ...o,
        prescriptions: [fixed ? toPrescription(fixed) : {}],
        score: optionScore(scoreTypes, fixed, names[o.exerciseId] ?? '', o.score),
      }),
    )
  const missing = s.exercises.some((o) => !o.score)

  return (
    <>
      <ol className={styles.options}>
        {s.exercises.map((o, i) => {
          const name = names[o.exerciseId] ?? 'Exercise'
          const fixed = fixedOf(o.prescriptions[0])
          const locked = logged.has(o.key)
          const lockedTitle = locked ? 'Members have logged results for this option' : undefined
          const allowed = measures(scoreTypes, fixed)
          return (
            <li key={o.key} className={styles.option} title={lockedTitle}>
              <span className={ui.muted}>{i === 0 ? 'Option' : 'or'}</span>
              <strong>{name}</strong>
              <label>
                <span className="visually-hidden">{name} amount</span>
                <input
                  className={ui.input}
                  type="number"
                  min={0}
                  step="any"
                  placeholder="amount"
                  disabled={locked}
                  value={fixed?.amount ?? ''}
                  onChange={(e) =>
                    setFixed(
                      i,
                      o,
                      e.target.value
                        ? {
                            amount: Number(e.target.value),
                            unit: fixed?.unit ?? 'm',
                          }
                        : undefined,
                    )
                  }
                />
              </label>
              <label>
                <span className="visually-hidden">{name} unit</span>
                <select
                  className={ui.input}
                  disabled={locked}
                  value={fixed?.unit ?? 'm'}
                  onChange={(e) => {
                    const unit = e.target.value
                    if (isUnit(unit)) setFixed(i, o, { amount: fixed?.amount ?? 0, unit })
                  }}
                >
                  {FIXED_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
              {allowed.length > 1 ? (
                <label>
                  <span className="visually-hidden">{name} scored by</span>
                  <select
                    className={ui.input}
                    disabled={locked}
                    value={o.score?.scoreTypeId ?? ''}
                    onChange={(e) => {
                      const t = allowed.find((x) => x._id === e.target.value)
                      if (t && o.score)
                        setOptions(
                          replaceAt(s.exercises, i, {
                            ...o,
                            score: { ...o.score, scoreTypeId: t._id },
                          }),
                        )
                    }}
                  >
                    {allowed.map((t) => (
                      <option key={t._id} value={t._id}>
                        scored by {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className={ui.muted}>
                  {allowed[0] ? `scored by ${allowed[0].name}` : 'no matching score type'}
                </span>
              )}
              <button
                type="button"
                className={`${ui.btnDanger} ${ui.btnSmall}`}
                aria-label={`Remove ${name}`}
                disabled={locked}
                onClick={() => setOptions(removeAt(s.exercises, i))}
              >
                ×
              </button>
            </li>
          )
        })}
      </ol>
      {missing && (
        <p className={ui.muted} role="alert">
          An option has no matching score type (For Time, Distance or Max load). Add it in Library.
        </p>
      )}
      <ExercisePicker
        withAmount
        placeholder="+ Add option, e.g. 2k row, 1 mile run"
        onError={p.onError}
        onPick={(exerciseId, name, fixed) => {
          p.onName(exerciseId, name)
          setOptions([
            ...s.exercises,
            {
              key: newKey(),
              exerciseId,
              prescriptions: [fixed ? toPrescription(fixed) : {}],
              score: optionScore(scoreTypes, fixed, name),
            },
          ])
        }}
      />
    </>
  )
}
