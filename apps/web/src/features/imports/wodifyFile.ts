import { norm, scoreTypeFor, type ScoreTypeName } from '../../../../../convex/wodify'

// Wodify performance results export (JSON, whole gym) -> what convex/wodifyImport.ts upserts:
// athletes, the programmed days (one scored section per component) and each athlete's results.

export type ImportAthlete = { wodifyId: string; name: string }
export type ImportComponent = { name: string; description: string; scoreType: ScoreTypeName }
export type ImportDay = { date: string; title: string; components: ImportComponent[] }
export type ImportLog = {
  wodifyId: string
  date: string
  component: string
  isRx: boolean
  notes?: string
  results: string[]
}
export type ParsedExport = {
  athletes: ImportAthlete[]
  days: ImportDay[]
  logs: ImportLog[]
  rowCount: number
  skipped: number // results whose score type we can't tell
  from: string
  to: string
}

const JSON_COLS = [
  'Result Date',
  'Client ID',
  'Client Name',
  'Workout',
  'Component',
  'Component Description',
  'Result',
  'Result Type',
  'Rx',
  'Result Comment',
] as const
type JsonRow = Record<(typeof JSON_COLS)[number], string>

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// "Dec 30, 2024" -> "2024-12-30"
function jsonDate(s: string): string {
  const m = /^(\w{3}) (\d{1,2}), (\d{4})$/.exec(s.trim())
  const month = m ? MONTHS.indexOf(m[1]) : -1
  if (!m || month < 0) throw new Error(`Can't read date "${s}"`)
  return new Date(Date.UTC(Number(m[3]), month, Number(m[2]))).toISOString().slice(0, 10)
}

// Results can be logged a day off; the workout name ("… - Mon, Dec 30") is the programmed day.
function workoutDate(resultDate: string, workout: string): string {
  const base = Date.parse(`${resultDate}T00:00:00Z`)
  for (const offset of [0, 1, -1]) {
    const d = new Date(base + offset * 86_400_000)
    const label = `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
    if (workout.trim().endsWith(label)) return d.toISOString().slice(0, 10)
  }
  return resultDate
}

const isJsonRow = (r: unknown): r is JsonRow =>
  !!r &&
  typeof r === 'object' &&
  JSON_COLS.every((c) => typeof (r as Record<string, unknown>)[c] === 'string')

function mostCommon<T extends string>(counts: Map<T, number>): T | undefined {
  let best: T | undefined
  for (const [k, n] of counts) if (best === undefined || n > counts.get(best)!) best = k
  return best
}

type Tally = {
  name: string
  descriptions: Map<string, number>
  scoreTypes: Map<ScoreTypeName, number>
}

export function parseWodifyJson(data: unknown): ParsedExport {
  if (!Array.isArray(data) || !data.length || !isJsonRow(data[0]))
    throw new Error('This doesn’t look like a Wodify performance results export')
  const athletes = new Map<string, ImportAthlete>()
  // Result rows are one per set/round: group by athlete + day + component.
  const logs = new Map<
    string,
    ImportLog & { loggedOn: string; resultType: string; description: string }
  >()
  for (const r of data) {
    if (!isJsonRow(r)) throw new Error('Some rows are missing columns')
    const wodifyId = r['Client ID'].trim()
    if (!athletes.has(wodifyId)) athletes.set(wodifyId, { wodifyId, name: r['Client Name'].trim() })
    const date = workoutDate(jsonDate(r['Result Date']), r.Workout)
    const component = r.Component.trim()
    const key = `${wodifyId}|${date}|${norm(component)}`
    const comment = r['Result Comment'].trim()
    const log = logs.get(key)
    if (log) {
      // Same day + component logged again on another date: keep the first.
      if (log.loggedOn !== r['Result Date']) continue
      log.results.push(r.Result)
      log.isRx ||= r.Rx === 'Rx'
      if (comment && !log.notes?.includes(comment))
        log.notes = log.notes ? `${log.notes}\n${comment}` : comment
      continue
    }
    logs.set(key, {
      wodifyId,
      date,
      component,
      isRx: r.Rx === 'Rx',
      notes: comment || undefined,
      results: [r.Result],
      loggedOn: r['Result Date'],
      resultType: r['Result Type'],
      description: r['Component Description'],
    })
  }

  const days = new Map<string, Map<string, Tally>>()
  let skipped = 0
  const out: ImportLog[] = []
  for (const l of logs.values()) {
    const scoreType = scoreTypeFor(l.resultType, l.results)
    if (!scoreType || !l.results.some((x) => x.trim())) {
      skipped++
      continue
    }
    const comps = days.get(l.date) ?? new Map<string, Tally>()
    days.set(l.date, comps)
    const c = comps.get(norm(l.component)) ?? {
      name: l.component,
      descriptions: new Map(),
      scoreTypes: new Map(),
    }
    comps.set(norm(l.component), c)
    c.descriptions.set(l.description, (c.descriptions.get(l.description) ?? 0) + 1)
    c.scoreTypes.set(scoreType, (c.scoreTypes.get(scoreType) ?? 0) + 1)
    out.push({
      wodifyId: l.wodifyId,
      date: l.date,
      component: l.component,
      isRx: l.isRx,
      notes: l.notes,
      results: l.results,
    })
  }

  const dayList = [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, comps]) => {
      const components = [...comps.values()].map((c) => ({
        name: c.name,
        description: mostCommon(c.descriptions) ?? '',
        scoreType: mostCommon(c.scoreTypes)!,
      }))
      const named = components.filter((c) => norm(c.name) !== 'metcon').map((c) => c.name)
      return {
        date,
        title: (named.length ? named.join(' · ') : 'Metcon').slice(0, 120),
        components,
      }
    })
  return {
    athletes: [...athletes.values()].sort((a, b) => a.name.localeCompare(b.name)),
    days: dayList,
    logs: out,
    rowCount: data.length,
    skipped,
    from: dayList[0]?.date ?? '',
    to: dayList[dayList.length - 1]?.date ?? '',
  }
}
