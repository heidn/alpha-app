import styles from './HistoryPage.module.css'

export type Point = { x: number; y: number; label: string; tip: string }

type Props = {
  points: Point[]
  // true = smaller is better (times, paces): the axis is flipped so better is always up.
  lowerIsBetter: boolean
  title: string
}

const W = 320
const H = 120
const PAD = { top: 12, right: 12, bottom: 22, left: 12 }

const shortDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' })

// One series over time: 2px line, 8px markers with hover titles, best point labelled.
export function TrendChart({ points, lowerIsBetter, title }: Props) {
  if (points.length < 2) return null
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
  const sx = (x: number) =>
    PAD.left + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (W - PAD.left - PAD.right)
  const span = (y: number) => (y1 === y0 ? 0.5 : (y - y0) / (y1 - y0))
  const sy = (y: number) =>
    PAD.top + (lowerIsBetter ? span(y) : 1 - span(y)) * (H - PAD.top - PAD.bottom)
  const best = points.reduce((b, p) => ((lowerIsBetter ? p.y < b.y : p.y > b.y) ? p : b))
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x)},${sy(p.y)}`).join(' ')

  return (
    <figure className={styles.chart}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <line
          className={styles.axis}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={H - PAD.bottom}
          y2={H - PAD.bottom}
        />
        <path className={styles.line} d={path} />
        {points.map((p, i) => (
          <g key={i} className={styles.point}>
            <circle className={styles.hit} cx={sx(p.x)} cy={sy(p.y)} r={10} />
            <circle className={styles.dot} cx={sx(p.x)} cy={sy(p.y)} r={4} />
            <title>{p.tip}</title>
          </g>
        ))}
        <text
          className={styles.bestLabel}
          x={sx(best.x)}
          y={Math.max(sy(best.y) - 8, 10)}
          textAnchor={sx(best.x) > W - 40 ? 'end' : sx(best.x) < 40 ? 'start' : 'middle'}
        >
          {best.label}
        </text>
        <text className={styles.tick} x={PAD.left} y={H - 6}>
          {shortDate(x0)}
        </text>
        <text className={styles.tick} x={W - PAD.right} y={H - 6} textAnchor="end">
          {shortDate(x1)}
        </text>
      </svg>
      <figcaption className={styles.caption}>{title} · better is up</figcaption>
    </figure>
  )
}
