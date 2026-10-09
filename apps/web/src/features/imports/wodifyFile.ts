import {
  isEmptyScore,
  norm,
  parseResults,
  scoreTypeFor,
  type ScoreTypeName,
} from '../../../../../convex/wodify'

// Wodify performance results export (JSON, whole gym) -> what convex/wodifyImport.ts upserts:
// athletes, the programmed days (a scored section per metcon component; lifts go in one Strength
// section as exercises), each athlete's results, and visits (athlete + day attended, scored or not).

export type ImportAthlete = { wodifyId: string; name: string }
export type ComponentKind = 'metcon' | 'lift'
export type ImportComponent = {
  name: string
  kind: ComponentKind
  description: string
  repScheme: string
  scoreType: ScoreTypeName
}
export type ImportDay = { date: string; title: string; components: ImportComponent[] }
export type ImportLog = {
  wodifyId: string
  date: string
  component: string
  isRx: boolean
  notes?: string
  results: string[]
}
export type ImportVisit = { wodifyId: string; date: string }
export type ParsedExport = {
  athletes: ImportAthlete[]
  days: ImportDay[]
  logs: ImportLog[]
  visits: ImportVisit[]
  exercises: string[] // lift names, for the exercise library
  rowCount: number
  empty: number // blank/zero results: kept as visits only
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
  'Component Type',
  'Component Description',
  'Rep Scheme',
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
  kind: ComponentKind
  descriptions: Map<string, number>
  repSchemes: Map<string, number>
  scoreTypes: Map<ScoreTypeName, number>
}

const bump = <T,>(m: Map<T, number>, k: T) => m.set(k, (m.get(k) ?? 0) + 1)

export function parseWodifyJson(data: unknown): ParsedExport {
  if (!Array.isArray(data) || !data.length || !isJsonRow(data[0]))
    throw new Error('This doesn’t look like a Wodify performance results export')
  const athletes = new Map<string, ImportAthlete>()
  // Result rows are one per set/round: group by athlete + day + component.
  const logs = new Map<
    string,
    ImportLog & {
      loggedOn: string
      resultType: string
      kind: ComponentKind
      description: string
      repScheme: string
    }
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
      kind: r['Component Type'].trim() === 'Weightlifting' ? 'lift' : 'metcon',
      description: r['Component Description'],
      repScheme: r['Rep Scheme'],
    })
  }

  const days = new Map<string, Map<string, Tally>>()
  let skipped = 0
  let empty = 0
  const out: ImportLog[] = []
  const visits = new Map<string, ImportVisit>()
  const exercises = new Map<string, string>()
  for (const l of logs.values()) {
    visits.set(`${l.wodifyId}|${l.date}`, { wodifyId: l.wodifyId, date: l.date })
    if (isEmptyScore(parseResults(l.results).sets)) {
      empty++
      continue
    }
    const scoreType = scoreTypeFor(l.resultType, l.results)
    if (!scoreType) {
      skipped++
      continue
    }
    const comps = days.get(l.date) ?? new Map<string, Tally>()
    days.set(l.date, comps)
    const c = comps.get(norm(l.component)) ?? {
      name: l.component,
      kind: l.kind,
      descriptions: new Map(),
      repSchemes: new Map(),
      scoreTypes: new Map(),
    }
    comps.set(norm(l.component), c)
    bump(c.descriptions, l.description)
    bump(c.repSchemes, l.repScheme)
    bump(c.scoreTypes, scoreType)
    if (l.kind === 'lift' && !exercises.has(norm(l.component))) exercises.set(norm(l.component), l.component)
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
      // Lifts first: that's the order of the day.
      const components = [...comps.values()]
        .sort((a, b) => Number(b.kind === 'lift') - Number(a.kind === 'lift'))
        .map((c) => ({
          name: c.name,
          kind: c.kind,
          description: mostCommon(c.descriptions) ?? '',
          repScheme: mostCommon(c.repSchemes) ?? '',
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
    visits: [...visits.values()],
    exercises: [...exercises.values()].sort((a, b) => a.localeCompare(b)),
    rowCount: data.length,
    empty,
    skipped,
    from: dayList[0]?.date ?? '',
    to: dayList[dayList.length - 1]?.date ?? '',
  }
}
