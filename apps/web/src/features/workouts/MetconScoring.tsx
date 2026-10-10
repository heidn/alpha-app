import type { ProgramSection } from '../../../../../convex/domain'
import ui from '../ui/ui.module.css'
import { FORMATS, isFormat } from './program.ts'
import type { ScoreTypeOption } from './ScoreControl.tsx'
import { metconResults, withCurrent } from './sectionKind.ts'
import styles from './WorkoutEditor.module.css'

type Props = {
  section: ProgramSection
  title: string
  scoreTypes: ScoreTypeOption[]
  locked: boolean
  onChange: (s: ProgramSection) => void
}

// One line: "[For Time] cap [20] min · result [Time]". The format decides the result.
export function MetconScoring({ section: s, title, scoreTypes, locked, onChange }: Props) {
  const format = s.format ?? 'forTime'
  const allowed = withCurrent(metconResults(scoreTypes, format), scoreTypes, s.score?.scoreTypeId)
  const lockedTitle = locked ? 'Members have logged results here' : undefined
  const capMin = s.timeCapSec === undefined ? '' : String(s.timeCapSec / 60)

  return (
    <div className={styles.score} title={lockedTitle}>
      <label>
        <span className="visually-hidden">Format</span>
        <select
          className={ui.input}
          value={format}
          disabled={locked}
          onChange={(e) => {
            if (!isFormat(e.target.value)) return
            const t = metconResults(scoreTypes, e.target.value)[0]
            onChange({
              ...s,
              format: e.target.value,
              score: s.score && t ? { scoreTypeId: t._id, title } : s.score,
            })
          }}
        >
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.cap}>
        {format === 'forTime' ? 'Cap' : 'Length'}
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
      <label className={styles.cap}>
        Result
        <select
          className={ui.input}
          value={s.score?.scoreTypeId ?? ''}
          disabled={locked}
          onChange={(e) => {
            const t = allowed.find((x) => x._id === e.target.value)
            onChange({ ...s, score: t && { scoreTypeId: t._id, title: s.score?.title ?? title } })
          }}
        >
          {allowed.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
          <option value="">Not scored</option>
        </select>
      </label>
    </div>
  )
}
