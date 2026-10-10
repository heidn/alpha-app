import { useState } from 'react'
import type { Prescription } from '../../../../../convex/domain'
import ui from '../ui/ui.module.css'
import { emptyPrescription, removeAt, replaceAt } from './program.ts'
import styles from './WorkoutEditor.module.css'

type NumKey =
  'sets' | 'reps' | 'weight' | 'femaleWeight' | 'percentage' | 'rpe' | 'distance' | 'femaleDistance'

// Optional column groups: shown when any row uses them or the coach turns them on.
type Group = 'base' | 'female' | 'percentage' | 'rpe' | 'distance'

const NUM_COLS: { key: NumKey; label: string; group: Group }[] = [
  { key: 'sets', label: 'Sets', group: 'base' },
  { key: 'reps', label: 'Reps', group: 'base' },
  { key: 'weight', label: 'Weight', group: 'base' },
  { key: 'femaleWeight', label: 'Weight ♀', group: 'female' },
  { key: 'percentage', label: '%', group: 'percentage' },
  { key: 'rpe', label: 'RPE', group: 'rpe' },
  { key: 'distance', label: 'Dist', group: 'distance' },
  { key: 'femaleDistance', label: 'Dist ♀', group: 'distance' },
]

const EXTRA: { group: Exclude<Group, 'base'>; label: string }[] = [
  { group: 'female', label: 'Weight ♀' },
  { group: 'percentage', label: '%' },
  { group: 'rpe', label: 'RPE' },
  { group: 'distance', label: 'Distance' },
]

const used = (rows: Prescription[], group: Group) =>
  NUM_COLS.some((c) => c.group === group && rows.some((r) => r[c.key] !== undefined)) ||
  (group === 'distance' && rows.some((r) => r.distanceUnit))

const toNum = (s: string) => (s === '' ? undefined : Number(s))

export function PrescriptionTable({
  rows,
  onChange,
}: {
  rows: Prescription[]
  onChange: (rows: Prescription[]) => void
}) {
  const [opened, setOpened] = useState<Set<Group>>(new Set())
  const set = (i: number, patch: Partial<Prescription>) =>
    onChange(replaceAt(rows, i, { ...rows[i], ...patch }))
  const shown = (g: Group) => g === 'base' || opened.has(g) || used(rows, g)
  const cols = NUM_COLS.filter((c) => shown(c.group))
  const hidden = EXTRA.filter((x) => !shown(x.group))

  return (
    <div className={styles.rxWrap}>
      <table className={styles.rx}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            <th>Units</th>
            <th>Note</th>
            <th>
              <span className="visually-hidden">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c.key}>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    aria-label={`${c.label}, row ${i + 1}`}
                    value={row[c.key] ?? ''}
                    onChange={(e) => set(i, { [c.key]: toNum(e.target.value) })}
                  />
                </td>
              ))}
              <td>
                <select
                  aria-label={`Weight unit, row ${i + 1}`}
                  value={row.weightUnit ?? ''}
                  onChange={(e) =>
                    set(i, {
                      weightUnit:
                        e.target.value === 'kg' ? 'kg' : e.target.value === 'lb' ? 'lb' : undefined,
                    })
                  }
                >
                  <option value="">wt</option>
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                </select>
                {shown('distance') && (
                  <select
                    aria-label={`Distance unit, row ${i + 1}`}
                    value={row.distanceUnit ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      set(i, {
                        distanceUnit: v === 'm' || v === 'km' || v === 'mi' ? v : undefined,
                      })
                    }}
                  >
                    <option value="">dist</option>
                    <option value="m">m</option>
                    <option value="km">km</option>
                    <option value="mi">mi</option>
                  </select>
                )}
              </td>
              <td>
                <input
                  className={styles.note}
                  aria-label={`Note, row ${i + 1}`}
                  placeholder="e.g. build to heavy"
                  value={row.customText ?? ''}
                  onChange={(e) => set(i, { customText: e.target.value || undefined })}
                />
              </td>
              <td>
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnSmall}`}
                  aria-label={`Remove row ${i + 1}`}
                  onClick={() => onChange(removeAt(rows, i))}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className={`${ui.btn} ${ui.btnSmall}`}
        onClick={() =>
          onChange([...rows, rows.length ? { ...rows[rows.length - 1] } : emptyPrescription()])
        }
      >
        + Row
      </button>
      {hidden.length > 0 && (
        <div className={styles.rxMore}>
          <span className={ui.muted}>More fields:</span>
          {hidden.map((x) => (
            <button
              key={x.group}
              type="button"
              className={`${ui.btn} ${ui.btnSmall}`}
              onClick={() => setOpened(new Set(opened).add(x.group))}
            >
              + {x.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
