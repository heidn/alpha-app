import type { ProgramSection } from '../../../../../convex/domain'
import ui from '../ui/ui.module.css'
import { ExercisePicker } from './ExercisePicker.tsx'
import { MetconFormat } from './MetconFormat.tsx'
import { PrescriptionTable } from './PrescriptionTable.tsx'
import { emptyPrescription, move, newKey, removeAt, replaceAt, scoreTypeFor } from './program.ts'
import { ScoreControl, type ScoreTypeOption } from './ScoreControl.tsx'
import { TestOptions } from './TestOptions.tsx'
import { fixedOf, optionScore } from './testOption.ts'
import styles from './WorkoutEditor.module.css'

type Props = {
  section: ProgramSection
  index: number
  count: number
  title: string
  names: Record<string, string>
  scoreTypes: ScoreTypeOption[]
  logged: Set<string>
  onChange: (s: ProgramSection) => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
  onSaveTemplate: () => void
  onName: (id: string, name: string) => void
  onError: (msg: string) => void
}

// Distance work (1 mi run, 2k row) and For Time sections are scored on time; lifts on weight.
const exerciseScoreType = (s: ProgramSection, e: ProgramSection['exercises'][number]) =>
  s.format === 'forTime' || e.prescriptions.some((r) => r.distance !== undefined || r.distanceUnit)
    ? 'For Time'
    : 'Weight per set'

// Standard ⇄ pick-one test. A test scores each option, never the section.
function withKind(s: ProgramSection, test: boolean, p: Props): ProgramSection {
  if (!test) return { ...s, kind: undefined }
  const exercises = s.exercises.map((e) => ({
    ...e,
    score: p.logged.has(e.key)
      ? e.score
      : optionScore(p.scoreTypes, fixedOf(e.prescriptions[0]), p.names[e.exerciseId] ?? '', e.score),
  }))
  return { ...s, kind: 'test', score: undefined, format: undefined, timeCapSec: undefined, exercises }
}

const hasLogs = (s: ProgramSection, logged: Set<string>) =>
  logged.has(s.key) || s.exercises.some((e) => logged.has(e.key))

export function SectionCard(p: Props) {
  const { section: s, logged } = p
  const isTest = s.kind === 'test'
  const scored = !!s.score || s.exercises.some((e) => e.score)
  const setExercises = (exercises: ProgramSection['exercises']) => p.onChange({ ...s, exercises })
  const lockedTitle = 'Members have logged results here'

  return (
    <article className={styles.section} data-scored={scored || undefined}>
      <header className={styles.sectionHead}>
        <h3>{p.title}</h3>
        <label>
          <span className="visually-hidden">Section type</span>
          <select
            className={ui.input}
            value={isTest ? 'test' : ''}
            disabled={logged.has(s.key)}
            title={logged.has(s.key) ? lockedTitle : undefined}
            onChange={(e) => p.onChange(withKind(s, e.target.value === 'test', p))}
          >
            <option value="">Standard</option>
            <option value="test">Pick-one test</option>
          </select>
        </label>
        {isTest ? (
          <span className={`${ui.pill} ${styles.scoredPill}`}>Each option scored</span>
        ) : scored ? (
          <span className={`${ui.pill} ${styles.scoredPill}`}>Scored</span>
        ) : (
          <span className={ui.pill}>Display only</span>
        )}
        <div className={styles.tools}>
          <button
            type="button"
            className={`${ui.btn} ${ui.btnSmall}`}
            title="Reuse this section on other workouts"
            onClick={p.onSaveTemplate}
          >
            Save as template
          </button>
          <button
            type="button"
            className={`${ui.btn} ${ui.btnSmall}`}
            aria-label="Move section up"
            disabled={p.index === 0}
            onClick={() => p.onMove(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            className={`${ui.btn} ${ui.btnSmall}`}
            aria-label="Move section down"
            disabled={p.index === p.count - 1}
            onClick={() => p.onMove(1)}
          >
            ↓
          </button>
          <button
            type="button"
            className={`${ui.btnDanger} ${ui.btnSmall}`}
            disabled={hasLogs(s, logged)}
            title={hasLogs(s, logged) ? lockedTitle : undefined}
            onClick={() => {
              const empty = !s.notes && s.exercises.length === 0 && !s.score
              if (empty || window.confirm(`Remove ${p.title}?`)) p.onRemove()
            }}
          >
            Remove
          </button>
        </div>
      </header>

      <label className={ui.field}>
        <span className="visually-hidden">Section notes</span>
        <textarea
          rows={2}
          placeholder="Notes (e.g. 21-15-9 for time, 12 min cap)"
          value={s.notes ?? ''}
          onChange={(e) => p.onChange({ ...s, notes: e.target.value || undefined })}
        />
      </label>

      {isTest ? (
        <TestOptions
          section={s}
          names={p.names}
          scoreTypes={p.scoreTypes}
          logged={logged}
          onChange={p.onChange}
          onName={p.onName}
          onError={p.onError}
        />
      ) : (
        <>
      <ScoreControl
        score={s.score}
        scoreTypes={p.scoreTypes}
        defaultTitle={p.title}
        defaultType={scoreTypeFor(s.format)}
        locked={logged.has(s.key)}
        onChange={(score) => p.onChange({ ...s, score })}
      />

      {(scored || s.format) && (
        <MetconFormat
          section={s}
          scoreTypes={p.scoreTypes}
          locked={logged.has(s.key)}
          onChange={p.onChange}
        />
      )}

      <ol className={styles.exercises}>
        {s.exercises.map((e, i) => {
          const name = p.names[e.exerciseId] ?? 'Exercise'
          return (
            <li key={e.key} className={styles.exercise}>
              <div className={styles.sectionHead}>
                <strong>{name}</strong>
                <div className={styles.tools}>
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.btnSmall}`}
                    aria-label={`Move ${name} up`}
                    disabled={i === 0}
                    onClick={() => setExercises(move(s.exercises, i, -1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.btnSmall}`}
                    aria-label={`Move ${name} down`}
                    disabled={i === s.exercises.length - 1}
                    onClick={() => setExercises(move(s.exercises, i, 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`${ui.btnDanger} ${ui.btnSmall}`}
                    aria-label={`Remove ${name}`}
                    disabled={logged.has(e.key)}
                    title={logged.has(e.key) ? lockedTitle : undefined}
                    onClick={() => {
                      if (window.confirm(`Remove ${name}?`)) setExercises(removeAt(s.exercises, i))
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <PrescriptionTable
                rows={e.prescriptions}
                onChange={(prescriptions) =>
                  setExercises(replaceAt(s.exercises, i, { ...e, prescriptions }))
                }
              />
              <ScoreControl
                score={e.score}
                scoreTypes={p.scoreTypes}
                defaultTitle={name}
                defaultType={exerciseScoreType(s, e)}
                locked={logged.has(e.key)}
                onChange={(score) => setExercises(replaceAt(s.exercises, i, { ...e, score }))}
              />
            </li>
          )
        })}
      </ol>

      <ExercisePicker
        onError={p.onError}
        onPick={(exerciseId, name) => {
          p.onName(exerciseId, name)
          setExercises([
            ...s.exercises,
            { key: newKey(), exerciseId, prescriptions: [emptyPrescription()] },
          ])
        }}
      />
        </>
      )}
    </article>
  )
}
