import type { ProgramSection } from '../../../../../convex/domain'
import ui from '../ui/ui.module.css'
import { FORMATS, isFormat, scoreTypeFor, typeNamed } from './program.ts'
import type { ScoreTypeOption } from './ScoreControl.tsx'
import styles from './WorkoutEditor.module.css'

type Props = {
  section: ProgramSection
  scoreTypes: ScoreTypeOption[]
  locked: boolean
  onChange: (s: ProgramSection) => void
}

// How the metcon runs + its cap/length. Changing the format also switches the section's score type.
export function MetconFormat({ section: s, scoreTypes, locked, onChange }: Props) {
  const setFormat = (value: string) => {
    const format = isFormat(value) ? value : undefined
    const type = format && !locked ? typeNamed(scoreTypes, scoreTypeFor(format)) : undefined
    onChange({
      ...s,
      format,
      timeCapSec: format ? s.timeCapSec : undefined,
      score: s.score && type ? { ...s.score, scoreTypeId: type._id } : s.score,
    })
  }
  const capMin = s.timeCapSec === undefined ? '' : String(s.timeCapSec / 60)
  return (
    <div className={styles.score}>
      <label>
        <span className="visually-hidden">Format</span>
        <select className={ui.input} value={s.format ?? ''} onChange={(e) => setFormat(e.target.value)}>
          <option value="">No format</option>
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      {s.format && (
        <label className={styles.cap}>
          {s.format === 'forTime' ? 'Time cap' : 'Length'}
          <input
            className={ui.input}
            type="number"
            min={0}
            step="any"
            placeholder="none"
            value={capMin}
            onChange={(e) =>
              onChange({
                ...s,
                timeCapSec: e.target.value ? Math.round(Number(e.target.value) * 60) : undefined,
              })
            }
          />
          min
        </label>
      )}
    </div>
  )
}
