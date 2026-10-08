import type { Id } from '../../../../../convex/_generated/dataModel'
import type { ProgramSection } from '../../../../../convex/domain'
import ui from '../ui/ui.module.css'
import styles from './WorkoutEditor.module.css'

export type Score = NonNullable<ProgramSection['score']>
export type ScoreTypeOption = { _id: Id<'scoreTypes'>; name: string }

type Props = {
  score: Score | undefined
  scoreTypes: ScoreTypeOption[]
  defaultTitle: string
  locked: boolean
  onChange: (score: Score | undefined) => void
}

// "Score this" toggle: present = members log a result for this item.
export function ScoreControl({ score, scoreTypes, defaultTitle, locked, onChange }: Props) {
  const lockedTitle = locked ? 'Members have logged results for this item' : undefined
  return (
    <div className={styles.score}>
      <label className={ui.check} title={lockedTitle}>
        <input
          type="checkbox"
          checked={!!score}
          disabled={locked || scoreTypes.length === 0}
          onChange={(e) =>
            onChange(
              e.target.checked && scoreTypes[0]
                ? { scoreTypeId: scoreTypes[0]._id, title: defaultTitle }
                : undefined,
            )
          }
        />
        Scored
      </label>
      {score && (
        <>
          <label>
            <span className="visually-hidden">Score type</span>
            <select
              className={ui.input}
              value={score.scoreTypeId}
              disabled={locked}
              title={lockedTitle}
              onChange={(e) => {
                const t = scoreTypes.find((s) => s._id === e.target.value)
                if (t) onChange({ ...score, scoreTypeId: t._id })
              }}
            >
              {scoreTypes.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Score title</span>
            <input
              className={ui.input}
              placeholder="Title shown to members"
              value={score.title}
              onChange={(e) => onChange({ ...score, title: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  )
}
