import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { hrefFor, navigate } from '../shell/useRoute.ts'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import { isoDate, weekDays } from './program.ts'
import styles from './WorkoutsPage.module.css'

const PICK_KEY = 'workouts.pick'

function readPick(): { gymId?: string; classId?: string } {
  try {
    return JSON.parse(localStorage.getItem(PICK_KEY) ?? '{}') as {
      gymId?: string
      classId?: string
    }
  } catch {
    return {}
  }
}

export function WorkoutsPage() {
  const gyms = useQuery(api.gyms.list)
  const [pick, setPick] = useState(readPick)
  const gym = gyms?.find((g) => g._id === pick.gymId) ?? gyms?.[0]
  const classes = useQuery(api.classes.listByGym, gym ? { gymId: gym._id } : 'skip')
  const cls = classes?.find((c) => c._id === pick.classId) ?? classes?.[0]
  const [offset, setOffset] = useState(0)
  const [now] = useState(() => new Date())

  useEffect(() => {
    try {
      localStorage.setItem(PICK_KEY, JSON.stringify(pick))
    } catch {
      // storage unavailable: selection just isn't remembered
    }
  }, [pick])

  const days = weekDays(now, offset)
  const range = { from: isoDate(days[0]), to: isoDate(days[6]) }

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div>
          <h1>Workouts</h1>
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
              onChange={(e) => setPick({ gymId: e.target.value })}
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
              onChange={(e) => setPick({ ...pick, gymId: gym?._id, classId: e.target.value })}
              disabled={!classes?.length}
            >
              {classes?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} · {c.startTime}
                </option>
              ))}
            </select>
          </label>
        </div>
        {gyms === undefined || (gym && classes === undefined) ? (
          <p className={ui.empty}>Loading…</p>
        ) : !gym ? (
          <p className={ui.empty}>No gyms yet. Create one under Gyms.</p>
        ) : !cls ? (
          <p className={ui.empty}>
            No classes at this gym. <a href={hrefFor({ name: 'gym', id: gym._id })}>Add one</a>.
          </p>
        ) : (
          <Week
            classId={cls._id}
            classDays={cls.daysOfWeek}
            days={days}
            range={range}
            today={isoDate(now)}
          />
        )}
        <div className={styles.weekNav}>
          <button type="button" className={ui.btn} onClick={() => setOffset((o) => o - 1)}>
            ← Prev
          </button>
          <button
            type="button"
            className={ui.btn}
            onClick={() => setOffset(0)}
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
}

function Week({ classId, classDays, days, range, today }: WeekProps) {
  const workouts = useQuery(api.workouts.listForClassRange, { classId, ...range })
  const create = useMutation(api.workouts.create)
  const { run, pending, error, clearError } = useRun()

  const onCreate = async (date: string) => {
    const r = await run(() => create({ classId, date, title: 'WOD' }))
    if (r.ok) navigate({ name: 'workout', id: r.value })
  }

  return (
    <>
      <ErrorBanner error={error} onDismiss={clearError} />
      <ol className={styles.week}>
        {days.map((d) => {
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
                  {workout.title}
                </a>
              ) : scheduled ? (
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnSmall}`}
                  disabled={pending}
                  onClick={() => void onCreate(date)}
                >
                  + Create
                </button>
              ) : (
                <span className={ui.muted}>No class</span>
              )}
            </li>
          )
        })}
      </ol>
    </>
  )
}
