import type { Id } from '../../../../../convex/_generated/dataModel'
import type { ProgramSection } from '../../../../../convex/domain'
import ui from '../ui/ui.module.css'
import { typeNamed } from './program.ts'
import styles from './WorkoutEditor.module.css'

export type Score = NonNullable<ProgramSection['score']>
export type ScoreTypeOption = { _id: Id<'scoreTypes'>; name: string }

type Props = {
  score: Score | undefined
  scoreTypes: ScoreTypeOption[]
  defaultTitle: string
  // Score type picked when "Scored" is ticked, by name; falls back to the first type.
  defaultType: string
  locked: boolean
  onChange: (score: Score | undefined) => void
}

// "Score this" toggle: present = members log a result for this item.
export function ScoreControl({ score, scoreTypes, defaultTitle, defaultType, locked, onChange }: Props) {
  const fallback = typeNamed(scoreTypes, defaultType) ?? scoreTypes[0]
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
              e.target.checked && fallback
                ? { scoreTypeId: fallback._id, title: defaultTitle }
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
