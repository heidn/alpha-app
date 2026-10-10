import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { useEffect, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Program } from '../../../../../convex/domain'
import { hrefFor, navigate } from '../shell/useRoute.ts'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import type { ProgramSection } from '../../../../../convex/domain'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import { move, newKey, removeAt, replaceAt } from './program.ts'
import { kindForTitle, toKind } from './sectionKind.ts'
import { SectionCard } from './SectionCard.tsx'
import styles from './WorkoutEditor.module.css'

type Workout = NonNullable<FunctionReturnType<typeof api.workouts.get>>
type Draft = { title: string; description?: string; durationMin?: number; program: Program }

const toDraft = (w: Workout): Draft => ({
  title: w.title,
  description: w.description,
  durationMin: w.durationMin,
  program: w.program,
})

export function WorkoutEditorPage({ id }: { id: string }) {
  const workout = useQuery(api.workouts.get, { workoutId: id })
  if (workout === undefined) return <p className={ui.muted}>Loading workout…</p>
  if (workout === null) return <p className={ui.muted}>Workout not found.</p>
  if (!workout.canEdit)
    return <p className={ui.muted}>You can view this workout but not edit it.</p>
  return <Editor workout={workout} />
}

function Editor({ workout }: { workout: Workout }) {
  const sections = useQuery(api.library.listSections)
  const templates = useQuery(api.templates.list)
  const saveTemplate = useMutation(api.templates.create)
  const scoreTypes = useQuery(api.library.listScoreTypes)
  const save = useMutation(api.workouts.save)
  const remove = useMutation(api.workouts.remove)
  const { run, pending, error, clearError, setError } = useRun()
  const [draft, setDraft] = useState<Draft>(() => toDraft(workout))
  const [names, setNames] = useState<Record<string, string>>({ ...workout.exerciseNames })
  const [addSection, setAddSection] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(workout))
  const logged = new Set(workout.loggedKeys)
  const sectionTitle = (sid: string) =>
    sections?.find((s) => s._id === sid)?.title ?? workout.sectionTitles[sid] ?? 'Section'
  const setProgram = (program: Program) => setDraft({ ...draft, program })

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    // In-app links only change the hash (no beforeunload), so confirm those clicks too.
    const guard = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null
      if (link && !window.confirm('Discard unsaved changes?')) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    document.addEventListener('click', guard, true)
    return () => {
      window.removeEventListener('beforeunload', warn)
      document.removeEventListener('click', guard, true)
    }
  }, [dirty])

  const onSave = async () => {
    const r = await run(() => save({ workoutId: workout._id, ...draft }))
    if (r.ok) setSavedAt(Date.now())
  }
  const onDelete = async () => {
    if (!window.confirm('Delete this workout?')) return
    if ((await run(() => remove({ workoutId: workout._id }))).ok) {
      navigate({ name: 'workouts' })
    }
  }
  const onAddSection = () => {
    const template = templates?.find((t) => `tpl:${t._id}` === addSection)
    const section = sections?.find((s) => s._id === addSection)
    if (template) {
      // Fresh keys: logs are keyed by item key, so a copy must not reuse the template's.
      const { section: t } = template
      const exercises = t.exercises.map((e) => ({ ...e, key: newKey() }))
      setProgram([...draft.program, { ...t, key: newKey(), exercises }])
      setNames((n) => ({ ...template.exerciseNames, ...n }))
    } else if (section) {
      const empty = { key: newKey(), sectionId: section._id, exercises: [] }
      const ctx = { types: scoreTypes ?? [], names, title: section.title }
      setProgram([...draft.program, toKind(empty, kindForTitle(section.title), ctx)])
    } else return
    setAddSection('')
  }
  const onSaveTemplate = async (section: ProgramSection) => {
    const name = window.prompt('Template name', sectionTitle(section.sectionId))?.trim()
    if (!name) return
    // Shows up under "Templates" in the Add a section list right away.
    await run(() => saveTemplate({ name, section }))
  }

  const date = new Date(`${workout.date}T00:00:00`)

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div>
          <a className={ui.crumb} href={hrefFor({ name: 'workouts' })}>
            ← Program
          </a>
          <h1>{draft.title || 'Untitled workout'}</h1>
          <p className={ui.sub}>
            {workout.className} ·{' '}
            {date.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          type="button"
          className={ui.btnDanger}
          disabled={pending || logged.size > 0}
          title={logged.size > 0 ? 'Members have logged results' : undefined}
          onClick={() => void onDelete()}
        >
          Delete
        </button>
      </header>

      <ErrorBanner error={error} onDismiss={clearError} />

      <section className={ui.card}>
        <div className={ui.form}>
          <div className={ui.row}>
            <label className={ui.field}>
              Title
              <input
                required
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className={ui.field}>
              Duration (min)
              <input
                type="number"
                min={1}
                max={600}
                value={draft.durationMin ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    durationMin: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </label>
          </div>
          <label className={ui.field}>
            Description
            <textarea
              rows={2}
              value={draft.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value || undefined })}
            />
          </label>
        </div>
      </section>

      {draft.program.map((s, i) => (
        <SectionCard
          key={s.key}
          section={s}
          index={i}
          count={draft.program.length}
          title={sectionTitle(s.sectionId)}
          names={names}
          scoreTypes={scoreTypes ?? []}
          logged={logged}
          onChange={(next) => setProgram(replaceAt(draft.program, i, next))}
          onMove={(d) => setProgram(move(draft.program, i, d))}
          onRemove={() => setProgram(removeAt(draft.program, i))}
          onSaveTemplate={() => void onSaveTemplate(s)}
          onName={(eid, name) => setNames((n) => ({ ...n, [eid]: name }))}
          onError={setError}
        />
      ))}

      <section className={`${ui.card} ${styles.addSection}`}>
        <label className={ui.field}>
          <span className="visually-hidden">Section to add</span>
          <select value={addSection} onChange={(e) => setAddSection(e.target.value)}>
            <option value="">
              {sections?.length ? 'Add a section…' : 'No sections. Add some in Library.'}
            </option>
            <optgroup label="Sections">
              {sections?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
            {!!templates?.length && (
              <optgroup label="Templates">
                {templates.map((t) => (
                  <option key={t._id} value={`tpl:${t._id}`}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <button type="button" className={ui.btn} disabled={!addSection} onClick={onAddSection}>
          Add section
        </button>
      </section>

      <div className={styles.saveBar}>
        <span className={ui.muted} role="status">
          {dirty ? 'Unsaved changes' : savedAt ? 'Saved' : 'No changes'}
        </span>
        <button
          type="button"
          className={ui.btnPrimary}
          disabled={pending || !dirty}
          title={!dirty ? 'Nothing to save' : undefined}
          onClick={() => void onSave()}
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
