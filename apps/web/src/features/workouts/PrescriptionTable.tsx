import type { Prescription } from '../../../../../convex/domain'
import ui from '../ui/ui.module.css'
import { emptyPrescription, removeAt, replaceAt } from './program.ts'
import styles from './WorkoutEditor.module.css'

type NumKey =
  'sets' | 'reps' | 'weight' | 'femaleWeight' | 'percentage' | 'rpe' | 'distance' | 'femaleDistance'

const NUM_COLS: { key: NumKey; label: string }[] = [
  { key: 'sets', label: 'Sets' },
  { key: 'reps', label: 'Reps' },
  { key: 'weight', label: 'Weight' },
  { key: 'femaleWeight', label: 'Weight ♀' },
  { key: 'percentage', label: '%' },
  { key: 'rpe', label: 'RPE' },
  { key: 'distance', label: 'Dist' },
  { key: 'femaleDistance', label: 'Dist ♀' },
]

const toNum = (s: string) => (s === '' ? undefined : Number(s))

export function PrescriptionTable({
  rows,
  onChange,
}: {
  rows: Prescription[]
  onChange: (rows: Prescription[]) => void
}) {
  const set = (i: number, patch: Partial<Prescription>) =>
    onChange(replaceAt(rows, i, { ...rows[i], ...patch }))

  return (
    <div className={styles.rxWrap}>
      <table className={styles.rx}>
        <thead>
          <tr>
            {NUM_COLS.map((c) => (
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
              {NUM_COLS.map((c) => (
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
                <select
                  aria-label={`Distance unit, row ${i + 1}`}
                  value={row.distanceUnit ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    set(i, { distanceUnit: v === 'm' || v === 'km' || v === 'mi' ? v : undefined })
                  }}
                >
                  <option value="">dist</option>
                  <option value="m">m</option>
                  <option value="km">km</option>
                  <option value="mi">mi</option>
                </select>
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
    </div>
  )
}
