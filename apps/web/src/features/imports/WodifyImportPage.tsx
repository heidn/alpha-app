import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { itemKey } from '../../../../../convex/wodify'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import styles from './WodifyImport.module.css'
import { parseWodifyJson, type ParsedExport } from './wodifyFile.ts'

// Sizes per call; must stay within the MAX limits in convex/wodifyImport.ts.
const CHUNK = { athletes: 100, days: 50, logs: 200, visits: 200 }

const chunks = <T,>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, (i + 1) * n))

type Progress = { label: string; done: number; total: number }
type Totals = { athletes: number; workouts: number; logs: number; visits: number; skipped: number }

export function WodifyImportPage() {
  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div>
          <h1>Imports</h1>
          <p className={ui.sub}>
            Bring in Wodify history from a performance results export (.json). Safe to run again:
            nothing is duplicated.
          </p>
        </div>
      </header>
      <ImportCard />
      <UnclaimedCard />
    </div>
  )
}

function ImportCard() {
  const classes = useQuery(api.wodifyImport.classOptions)
  const [file, setFile] = useState<{ name: string; parsed: ParsedExport } | null>(null)
  const [classId, setClassId] = useState<Id<'classes'> | ''>('')
  const [progress, setProgress] = useState<Progress | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { run, pending, error, clearError, setError } = useRun()
  const prepare = useMutation(api.wodifyImport.prepare)
  const upsertAthletes = useMutation(api.wodifyImport.upsertAthletes)
  const upsertWorkouts = useMutation(api.wodifyImport.upsertWorkouts)
  const upsertLogs = useMutation(api.wodifyImport.upsertLogs)
  const upsertVisits = useMutation(api.wodifyImport.upsertVisits)
  const removeImported = useMutation(api.wodifyImport.removeImported)
  const removeImportedVisits = useMutation(api.wodifyImport.removeImportedVisits)

  const onPick = async (f: File | undefined) => {
    clearError()
    setNotice(null)
    setFile(null)
    if (!f) return
    try {
      setFile({ name: f.name, parsed: parseWodifyJson(JSON.parse(await f.text())) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t read this file')
    }
  }

  const onImport = async () => {
    if (!file || !classId) return
    setNotice(null)
    const { athletes, days, logs, visits } = file.parsed
    const r = await run(async () => {
      const totals: Totals = { athletes: 0, workouts: 0, logs: 0, visits: 0, skipped: 0 }
      const step = async <T,>(label: string, parts: T[][], send: (part: T[]) => Promise<void>) => {
        for (const [i, part] of parts.entries()) {
          setProgress({ label, done: i, total: parts.length })
          await send(part)
        }
      }
      setProgress({ label: 'Preparing library', done: 0, total: 1 })
      await prepare({ scoreTypes: [...new Set(days.flatMap((d) => d.components.map((c) => c.scoreType)))] })

      const users = new Map<string, Id<'users'>>()
      await step('Athletes', chunks(athletes, CHUNK.athletes), async (part) => {
        const res = await upsertAthletes({ classId, athletes: part })
        for (const u of res.users) users.set(u.wodifyId, u.userId)
        totals.athletes += res.created
      })

      const workouts = new Map<string, Id<'workouts'>>()
      await step('Workouts', chunks(days, CHUNK.days), async (part) => {
        const res = await upsertWorkouts({ classId, days: part })
        for (const w of res.workouts) workouts.set(w.date, w.workoutId)
        totals.workouts += res.created + res.updated
      })

      const rows = logs.flatMap((l) => {
        const userId = users.get(l.wodifyId)
        const workoutId = workouts.get(l.date)
        if (!userId || !workoutId) return []
        const { isRx, notes, results } = l
        return [{ userId, workoutId, itemKey: itemKey(l.component), isRx, notes, results }]
      })
      await step('Results', chunks(rows, CHUNK.logs), async (part) => {
        const res = await upsertLogs({ logs: part })
        totals.logs += res.created + res.updated
        totals.skipped += res.skipped
      })

      const attended = visits.flatMap((x) => {
        const userId = users.get(x.wodifyId)
        return userId ? [{ userId, date: x.date }] : []
      })
      await step('Attendance', chunks(attended, CHUNK.visits), async (part) => {
        const res = await upsertVisits({ classId, visits: part })
        totals.visits += res.created
      })
      return totals
    })
    setProgress(null)
    if (r.ok) {
      const t = r.value
      setNotice(
        `Done. New athletes: ${t.athletes} · workouts added or changed: ${t.workouts} · results added or changed: ${t.logs} · visits added: ${t.visits}` +
          (t.skipped ? ` · ${t.skipped} skipped (no result, or already logged in the app)` : ''),
      )
    }
  }

  const onRemove = async () => {
    if (!classId) return
    if (
      !window.confirm(
        'Delete all imported workouts, results and attendance for this class? Anything made in the app stays.',
      )
    )
      return
    setNotice(null)
    const r = await run(async () => {
      let cursor: string | null = null
      const removed = { workouts: 0, logs: 0, visits: 0 }
      for (;;) {
        setProgress({ label: 'Removing workouts', done: removed.workouts, total: 0 })
        const res: Awaited<ReturnType<typeof removeImported>> = await removeImported({
          classId,
          paginationOpts: { numItems: 25, cursor },
        })
        removed.workouts += res.workouts
        removed.logs += res.logs
        if (res.isDone) break
        cursor = res.cursor
      }
      cursor = null
      for (;;) {
        setProgress({ label: 'Removing attendance', done: removed.visits, total: 0 })
        const res: Awaited<ReturnType<typeof removeImportedVisits>> = await removeImportedVisits({
          classId,
          paginationOpts: { numItems: 500, cursor },
        })
        removed.visits += res.visits
        if (res.isDone) return removed
        cursor = res.cursor
      }
    })
    setProgress(null)
    if (r.ok)
      setNotice(
        `Removed ${r.value.workouts} workouts, ${r.value.logs} results and ${r.value.visits} visits.`,
      )
  }

  const p = file?.parsed
  const disabledWhy = !file ? 'Choose a file first' : !classId ? 'Choose the class first' : undefined
  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>Performance results</h2>
      </div>
      <ErrorBanner error={error} onDismiss={clearError} />
      <div className={ui.form}>
        <label className={ui.field}>
          Wodify export (.json)
          <input
            type="file"
            accept=".json,application/json"
            disabled={pending}
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
        </label>
        {p && (
          <p className={styles.summary}>
            {p.athletes.length} athletes · {p.days.length} days · {p.logs.length} results ·{' '}
            {p.visits.length} visits · {p.from} to {p.to}
            {p.empty ? ` · ${p.empty} blank or zero results kept as attendance only` : ''}
            {p.skipped ? ` · ${p.skipped} results of an unknown type left out` : ''}
          </p>
        )}
        <label className={ui.field}>
          Class
          <select
            value={classId}
            disabled={pending || classes === undefined}
            onChange={(e) => setClassId(e.target.value as Id<'classes'>)}
          >
            <option value="">
              {classes === undefined ? 'Loading…' : classes.length ? 'Choose the class to import into…' : 'No classes yet: create one under Gyms'}
            </option>
            {classes?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.startTime})
              </option>
            ))}
          </select>
        </label>
        {progress && (
          <div className={styles.progress} role="status">
            <span>
              {progress.label}
              {progress.total > 1 ? ` ${progress.done + 1} of ${progress.total}` : '…'}
            </span>
            {progress.total > 1 && <progress max={progress.total} value={progress.done} />}
          </div>
        )}
        {notice && (
          <p className={ui.notice} role="status">
            {notice}
          </p>
        )}
        <div className={ui.formActions}>
          <button
            type="button"
            className={ui.btnDanger}
            disabled={!classId || pending}
            title={!classId ? 'Choose the class first' : undefined}
            onClick={() => void onRemove()}
          >
            Remove imported data
          </button>
          <button
            type="button"
            className={ui.btnPrimary}
            disabled={!!disabledWhy || pending}
            title={disabledWhy}
            onClick={() => void onImport()}
          >
            {pending ? 'Working…' : 'Import'}
          </button>
        </div>
      </div>
    </section>
  )
}

// Athletes whose names didn't match anyone at sign-in: merge them into the right account.
function UnclaimedCard() {
  const unclaimed = useQuery(api.wodifyImport.unclaimed)
  const users = usePaginatedQuery(api.admin.listUsers, {}, { initialNumItems: 200 })
  const merge = useMutation(api.wodifyImport.mergeImportedUser)
  const [target, setTarget] = useState<Record<string, Id<'users'> | ''>>({})
  const { run, pending, error, clearError } = useRun()
  const signedIn = users.results.filter((u) => u.signedIn)

  const onMerge = async (importedUserId: Id<'users'>) => {
    const userId = target[importedUserId]
    if (!userId) return
    await run(async () => {
      for (let i = 0; i < 100; i++) {
        if ((await merge({ importedUserId, userId })).done) return
      }
      throw new ConvexError('Still moving results: press Merge again')
    })
  }

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>Not signed in yet</h2>
      </div>
      <p className={ui.muted}>
        Imported athletes are matched to their account by name when they first sign in. If a name
        didn’t match, merge the athlete into the right account here.
      </p>
      <ErrorBanner error={error} onDismiss={clearError} />
      {unclaimed === undefined ? (
        <p className={ui.empty}>Loading…</p>
      ) : unclaimed.length === 0 ? (
        <p className={ui.empty}>Everyone imported has signed in.</p>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Imported athlete</th>
                <th>Merge into</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {unclaimed.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>
                    <label>
                      <span className="visually-hidden">Account for {u.name}</span>
                      <select
                        value={target[u._id] ?? ''}
                        onChange={(e) => setTarget({ ...target, [u._id]: e.target.value as Id<'users'> })}
                      >
                        <option value="">Choose an account…</option>
                        {signedIn.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                            {s.email ? ` (${s.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={ui.btnSmall}
                      disabled={!target[u._id] || pending}
                      title={!target[u._id] ? 'Choose an account first' : undefined}
                      onClick={() => void onMerge(u._id)}
                    >
                      Merge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
