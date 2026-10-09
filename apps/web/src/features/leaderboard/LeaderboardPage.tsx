import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { useClassPick } from '../classes/useClassPick.ts'
import { hrefFor } from '../shell/useRoute.ts'
import { Avatar } from '../ui/Avatar.tsx'
import ui from '../ui/ui.module.css'
import { isoDate } from '../workouts/program.ts'
import styles from './LeaderboardPage.module.css'
import { formatScore, formatSets } from './score.ts'

type Day = FunctionReturnType<typeof api.leaderboard.day>
type Item = Day['items'][number]

const longDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export function LeaderboardPage() {
  const { gyms, gym, classes, cls, loading, pickGym, pickClass } = useClassPick()
  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div>
          <h1>Leaderboard</h1>
          <p className={ui.sub}>
            Results for one class day, best first. Members who haven’t signed up yet show here
            only.
          </p>
        </div>
      </header>

      <section className={ui.card}>
        <div className={ui.cardHead}>
          <label className={ui.field}>
            Gym
            <select value={gym?._id ?? ''} onChange={(e) => pickGym(e.target.value)} disabled={!gyms?.length}>
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
                  {c.name} · {c.startTime}
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
          <p className={ui.empty}>No classes at this gym yet.</p>
        ) : null}
      </section>

      {cls && <ClassDay key={cls._id} classId={cls._id} />}
    </div>
  )
}

function ClassDay({ classId }: { classId: Id<'classes'> }) {
  const [today] = useState(() => isoDate(new Date()))
  // null = not picked yet: open on today, or the latest workout before it.
  const [picked, setDate] = useState<string | null>(null)
  const data = useQuery(api.leaderboard.day, {
    classId,
    date: picked ?? today,
    orLatestBefore: picked === null,
  })
  const date = data?.date ?? picked ?? today

  return (
    <>
      <nav className={styles.dayNav} aria-label="Day">
        <button
          type="button"
          className={ui.btn}
          disabled={!data?.prev}
          title={data && !data.prev ? 'No earlier workouts' : undefined}
          onClick={() => data?.prev && setDate(data.prev)}
        >
          ← Previous
        </button>
        <label className={styles.date}>
          <span className="visually-hidden">Date</span>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <button
          type="button"
          className={ui.btn}
          disabled={!data?.next}
          title={data && !data.next ? 'No later workouts' : undefined}
          onClick={() => data?.next && setDate(data.next)}
        >
          Next →
        </button>
      </nav>

      {data === undefined ? (
        <section className={ui.card}>
          <p className={ui.empty}>Loading…</p>
        </section>
      ) : !data.workout ? (
        <section className={ui.card}>
          <p className={ui.empty}>No workout on {longDate(date)}. Use Previous or Next to find one.</p>
        </section>
      ) : (
        <>
          <p className={styles.dayTitle}>
            {longDate(date)} ·{' '}
            <a href={hrefFor({ name: 'workout', id: data.workout._id })}>{data.workout.title}</a>
          </p>
          {!data.items.length ? (
            <section className={ui.card}>
              <p className={ui.empty}>Nothing on this day is scored.</p>
            </section>
          ) : (
            data.items.map((item) => <Board key={item.key} item={item} />)
          )}
        </>
      )}
    </>
  )
}

// Same place for equal results: 1, 2, 2, 4.
function ranks(item: Item) {
  return item.entries.map((e, i, all) => {
    let j = i
    while (
      j > 0 &&
      all[j - 1].sortValue === e.sortValue &&
      (item.kind === 'lift' || !!all[j - 1].isRx === !!e.isRx)
    )
      j--
    return j + 1
  })
}

function Board({ item }: { item: Item }) {
  const place = ranks(item)
  const showRx = item.kind === 'section'
  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>{item.title}</h2>
        <span className={ui.muted}>
          {item.scoreType?.name ?? 'Score'} · {item.entries.length}{' '}
          {item.entries.length === 1 ? 'result' : 'results'}
          {item.truncated ? ' (top shown)' : ''}
        </span>
      </div>
      {!item.entries.length ? (
        <p className={ui.empty}>No results logged.</p>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={styles.rank}>#</th>
                <th>Athlete</th>
                <th>Score</th>
                {showRx && <th>Rx</th>}
              </tr>
            </thead>
            <tbody>
              {item.entries.map((e, i) => {
                const detail = formatSets(e.sets, e.unit)
                return (
                  <tr key={e.logId}>
                    <td className={styles.rank}>{e.sortValue === undefined ? '–' : place[i]}</td>
                    <td>
                      <span className={styles.athlete}>
                        <Avatar name={e.name} imageUrl={e.imageUrl} size={28} />
                        {e.name}
                        {!e.signedUp && <span className={ui.pill}>Not signed up</span>}
                      </span>
                    </td>
                    <td>
                      <span className={styles.score}>{formatScore(e.sets, e.unit)}</span>
                      {detail && <div className={ui.muted}>{detail}</div>}
                    </td>
                    {showRx && (
                      <td>
                        <span className={ui.pill}>{e.isRx ? 'Rx' : 'Scaled'}</span>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
