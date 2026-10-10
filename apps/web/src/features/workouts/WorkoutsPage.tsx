import { useMutation, useQuery } from 'convex/react'
import { useState, type CSSProperties } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { useClassPick } from '../classes/useClassPick.ts'
import { hrefFor, navigate } from '../shell/useRoute.ts'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import { addDays, isoDate, weekDays } from './program.ts'
import styles from './WorkoutsPage.module.css'

// Week being viewed (its Monday), kept for the tab so returning from the editor doesn't reset it.
const WEEK_KEY = 'workouts.week'
const readWeek = () => {
  try {
    return sessionStorage.getItem(WEEK_KEY)
  } catch {
    return null
  }
}

export function WorkoutsPage() {
  const { gyms, gym, classes, cls, loading, pickGym, pickClass } = useClassPick()
  const [now] = useState(() => new Date())
  const [weekStart, setWeekStart] = useState(() => {
    const saved = readWeek()
    return saved ? new Date(`${saved}T00:00:00`) : weekDays(now, 0)[0]
  })
  const thisMonday = weekDays(now, 0)[0]
  // Rounded: a DST change makes the gap between Mondays an hour off.
  const offset = Math.round((weekStart.getTime() - thisMonday.getTime()) / (7 * 86_400_000))
  const setOffset = (next: (o: number) => number) => {
    const start = weekDays(now, next(offset))[0]
    setWeekStart(start)
    try {
      sessionStorage.setItem(WEEK_KEY, isoDate(start))
    } catch {
      // Storage unavailable: the week just won't survive navigation.
    }
  }

  const days = weekDays(now, offset)
  const range = { from: isoDate(days[0]), to: isoDate(days[6]) }

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div>
          <h1>Program</h1>
          <p className={ui.sub}>
            Program each class day. Athletes in the class see it automatically.
          </p>
        </div>
      </header>

      <section className={ui.card}>
        <div className={ui.cardHead}>
          <label className={ui.field}>
            Gym
            <select
              value={gym?._id ?? ''}
              onChange={(e) => pickGym(e.target.value)}
              disabled={!gyms?.length}
            >
              {gyms?.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.field}>
            Class
            <select
              value={cls?._id ?? ''}
              onChange={(e) => pickClass(e.target.value)}
              disabled={!classes?.length}
            >
              {classes?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <p className={ui.empty}>Loading…</p>
        ) : !gym ? (
          <p className={ui.empty}>No gyms yet. Create one under Gyms.</p>
        ) : !cls ? (
          <p className={ui.empty}>
            No classes at this gym. <a href={hrefFor({ name: 'gym', id: gym._id })}>Add one</a>.
          </p>
        ) : (
          <Week
            key={`${cls._id}-${range.from}`}
            classId={cls._id}
            classDays={cls.daysOfWeek}
            days={days}
            range={range}
            today={isoDate(now)}
            now={now.getTime()}
          />
        )}
        <div className={styles.weekNav}>
          <button type="button" className={ui.btn} onClick={() => setOffset((o) => o - 1)}>
            ← Prev
          </button>
          <button
            type="button"
            className={ui.btn}
            onClick={() => setOffset(() => 0)}
            disabled={offset === 0}
          >
            This week
          </button>
          <button type="button" className={ui.btn} onClick={() => setOffset((o) => o + 1)}>
            Next →
          </button>
        </div>
      </section>
    </div>
  )
}

type WeekProps = {
  classId: Id<'classes'>
  classDays: number[]
  days: Date[]
  range: { from: string; to: string }
  today: string
  now: number
}

function Week({ classId, classDays, days, range, today, now }: WeekProps) {
  const workouts = useQuery(api.workouts.listForClassRange, { classId, ...range })
  const create = useMutation(api.workouts.create)
  const copyDay = useMutation(api.workouts.copyDay)
  const copyWeek = useMutation(api.workouts.copyWeek)
  const { run, pending, error, clearError } = useRun()
  const [copying, setCopying] = useState<{ id: Id<'workouts'>; to: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const onCreate = async (date: string) => {
    const r = await run(() => create({ classId, date, title: 'WOD' }))
    if (r.ok) navigate({ name: 'workout', id: r.value })
  }
  const onCopyDay = async () => {
    if (!copying) return
    const r = await run(() => copyDay({ workoutId: copying.id, toDate: copying.to }))
    if (r.ok) {
      setCopying(null)
      setNotice(`Copied to ${new Date(`${copying.to}T00:00:00`).toLocaleDateString()}.`)
    }
  }
  const onCopyWeek = async () => {
    const lastMonday = addDays(days[0], -7)
    if (!window.confirm('Copy last week’s workouts into the empty days of this week?')) return
    const r = await run(() =>
      copyWeek({ classId, fromDate: isoDate(lastMonday), toDate: range.from }),
    )
    if (r.ok) {
      const { copied, skipped } = r.value
      const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
      setNotice(
        copied + skipped === 0
          ? 'Last week has no workouts to copy.'
          : `Copied ${plural(copied, 'workout')}` +
              (skipped ? `, skipped ${plural(skipped, 'day')} already programmed.` : '.'),
      )
    }
  }

  // Days the class runs, plus any off-day that still has a workout (e.g. imported).
  const shown = days.filter(
    (d) =>
      classDays.includes(d.getDay()) || workouts?.some((w) => w.date === isoDate(d)),
  )

  return (
    <>
      <ErrorBanner error={error} onDismiss={clearError} />
      <div className={styles.weekTools}>
        {notice && (
          <span className={ui.muted} role="status">
            {notice}
          </span>
        )}
        <button
          type="button"
          className={`${ui.btn} ${ui.btnSmall}`}
          disabled={pending || workouts === undefined}
          onClick={() => void onCopyWeek()}
        >
          Copy last week
        </button>
      </div>
      {shown.length === 0 && workouts !== undefined && (
        <p className={ui.empty}>This class has no scheduled days. Set them on the class page.</p>
      )}
      <ol className={styles.week} style={{ '--cols': shown.length || 1 } as CSSProperties}>
        {shown.map((d) => {
          const date = isoDate(d)
          const workout = workouts?.find((w) => w.date === date)
          const scheduled = classDays.includes(d.getDay())
          return (
            <li
              key={date}
              className={styles.day}
              data-today={date === today || undefined}
              data-off={!scheduled || undefined}
            >
              <div className={styles.dayHead}>
                {d.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              {workouts === undefined ? (
                <span className={ui.muted}>…</span>
              ) : workout ? (
                <a className={styles.workout} href={hrefFor({ name: 'workout', id: workout._id })}>
                  <strong>{workout.title}</strong>
                  {workout.summary.map((line, i) => (
                    <span key={i} className={styles.summary}>
                      {line}
                    </span>
                  ))}
                </a>
              ) : null}
              {workout?.releasesAt !== undefined && workout.releasesAt > now && (
                <span className={styles.summary}>
                  Athletes see it{' '}
                  {new Date(workout.releasesAt).toLocaleString(undefined, {
                    weekday: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              )}
              {workout && date <= today && (
                <a className={styles.results} href={hrefFor({ name: 'leaderboard', date })}>
                  Results
                </a>
              )}
              {workout && copying?.id !== workout._id && (
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnSmall} ${styles.dayAction}`}
                  onClick={() => setCopying({ id: workout._id, to: isoDate(addDays(d, 7)) })}
                >
                  Copy to…
                </button>
              )}
              {workout && copying?.id === workout._id && (
                <div className={styles.copyTo}>
                  <label>
                    <span className="visually-hidden">Copy to date</span>
                    <input
                      type="date"
                      className={ui.input}
                      value={copying.to}
                      onChange={(e) => setCopying({ ...copying, to: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className={`${ui.btnPrimary} ${ui.btnSmall}`}
                    disabled={pending || !copying.to || copying.to === date}
                    title={copying.to === date ? 'Pick another day' : undefined}
                    onClick={() => void onCopyDay()}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.btnSmall}`}
                    onClick={() => setCopying(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {workouts !== undefined && !workout && (
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnSmall}`}
                  disabled={pending}
                  onClick={() => void onCreate(date)}
                >
                  + Create
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </>
  )
}
