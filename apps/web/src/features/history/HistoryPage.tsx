import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import type { FunctionReturnType } from 'convex/server'
import { formatScore, formatTime } from '../leaderboard/score.ts'
import { hrefFor } from '../shell/useRoute.ts'
import ui from '../ui/ui.module.css'
import styles from './HistoryPage.module.css'
import { paceOf, paceUnitFor, type PaceUnit } from './pace.ts'
import { TrendChart, type Point } from './TrendChart.tsx'

type Data = FunctionReturnType<typeof api.history.exercise>
type Variant = Data['variants'][number]

const day = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

const lowerIsBetter = (v: Variant) => v.scoreType?.sort === 'asc'

function bestOf(v: Variant) {
  const scored = v.entries.filter((e) => e.sortValue !== undefined)
  if (!scored.length) return undefined
  return scored.reduce((b, e) =>
    (lowerIsBetter(v) ? e.sortValue! < b.sortValue! : e.sortValue! > b.sortValue!) ? e : b,
  )
}

const paceText = (sec: number | undefined, per: PaceUnit) =>
  sec === undefined ? '' : `${formatTime(sec)} /${per}`

// One athlete × one movement: a card per variant (Row · 2,000 m, 500 m, …), plus pace across all.
export function HistoryPage({ userId, exerciseId }: { userId: string; exerciseId: string }) {
  const data = useQuery(api.history.exercise, {
    userId: userId as Id<'users'>,
    exerciseId: exerciseId as Id<'exercises'>,
  })

  if (data === undefined)
    return (
      <div className={ui.page}>
        <section className={ui.card}>
          <p className={ui.empty}>Loading…</p>
        </section>
      </div>
    )

  const per = paceUnitFor(data.variants.map((v) => v.variant))
  const pacePoints: Point[] = data.variants.flatMap((v) =>
    v.entries.flatMap((e) => {
      const pace = paceOf(v.variant, e.sets, e.unit, per)
      if (pace === undefined) return []
      const label = paceText(pace, per)
      return [
        { x: e.loggedAt, y: pace, label, tip: `${day(e.loggedAt)} · ${v.variant} · ${label}` },
      ]
    }),
  )
  pacePoints.sort((a, b) => a.x - b.x)
  const paceVariants = new Set(
    data.variants.filter((v) => v.entries.some((e) => paceOf(v.variant, e.sets, e.unit, per))),
  )

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div>
          <a className={ui.crumb} href={hrefFor({ name: 'leaderboard' })}>
            ← Leaderboard
          </a>
          <h1>{data.exercise.name}</h1>
          <p className={ui.sub}>
            {data.athlete.name} · {data.variants.length}{' '}
            {data.variants.length === 1 ? 'variation' : 'variations'}
            {data.truncated ? ' (latest 500 results)' : ''}
          </p>
        </div>
      </header>

      {data.variants.length === 0 && (
        <section className={ui.card}>
          <p className={ui.empty}>No results logged for {data.exercise.name} yet.</p>
        </section>
      )}

      {paceVariants.size > 1 && pacePoints.length > 1 && (
        <section className={ui.card}>
          <div className={ui.cardHead}>
            <h2>Pace across all distances</h2>
            <span className={ui.muted}>per {per}</span>
          </div>
          <div className={styles.body}>
            <TrendChart
              points={pacePoints}
              lowerIsBetter
              title={`${data.exercise.name} pace per ${per}`}
            />
          </div>
        </section>
      )}

      <div className={styles.grid}>
        {data.variants.map((v) => (
          <VariantCard
            key={`${v.variant}|${v.scoreType?.name}`}
            v={v}
            name={data.exercise.name}
            per={per}
          />
        ))}
      </div>
    </div>
  )
}

function VariantCard({ v, name, per }: { v: Variant; name: string; per: PaceUnit }) {
  const best = bestOf(v)
  const title = v.variant ? `${v.variant} ${name}` : name
  const points: Point[] = v.entries.flatMap((e) =>
    e.sortValue === undefined
      ? []
      : [
          {
            x: e.loggedAt,
            y: e.sortValue,
            label: formatScore(e.sets, e.unit),
            tip: `${day(e.loggedAt)} · ${formatScore(e.sets, e.unit)}`,
          },
        ],
  )
  const recent = [...v.entries].reverse()
  const showPace = v.entries.some((e) => paceOf(v.variant, e.sets, e.unit, per) !== undefined)
  const showRx = v.entries.some((e) => e.isRx !== undefined)

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>{title}</h2>
        <span className={ui.muted}>
          {v.scoreType?.name ?? 'Score'} · {v.entries.length}{' '}
          {v.entries.length === 1 ? 'result' : 'results'}
        </span>
      </div>
      <div className={styles.body}>
        {best && (
          <p className={styles.best}>
            Best <strong>{formatScore(best.sets, best.unit)}</strong>{' '}
            <span className={ui.muted}>{day(best.loggedAt)}</span>
          </p>
        )}
        <TrendChart points={points} lowerIsBetter={lowerIsBetter(v)} title={title} />
      </div>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Score</th>
              {showPace && <th>Pace</th>}
              {showRx && <th>Rx</th>}
            </tr>
          </thead>
          <tbody>
            {recent.map((e) => (
              <tr key={e.logId}>
                <td>
                  <a href={hrefFor({ name: 'workout', id: e.workoutId })}>{day(e.loggedAt)}</a>
                </td>
                <td>
                  <span className={styles.score}>{formatScore(e.sets, e.unit)}</span>
                  {e === best && <span className={ui.pill}>Best</span>}
                  {e.notes && <div className={ui.muted}>{e.notes}</div>}
                </td>
                {showPace && <td>{paceText(paceOf(v.variant, e.sets, e.unit, per), per)}</td>}
                {showRx && (
                  <td>
                    <span className={ui.pill}>{e.isRx ? 'Rx' : 'Scaled'}</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
