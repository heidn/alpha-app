import type { MemberSet, MetconFormat, Prescription, ScoreField } from './domain'

// Pure Wodify parsing (no server imports): result strings -> sets, result types -> score types.

type SetFields = Omit<MemberSet, 'setNumber'>
type WeightUnit = 'lb' | 'kg'
type DistanceUnit = 'm' | 'km' | 'mi'

export const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()

// Convex returns object fields sorted and drops undefined ones, so compare that way.
const canonical = (x: unknown): unknown =>
  Array.isArray(x)
    ? x.map(canonical)
    : x && typeof x === 'object'
      ? Object.fromEntries(
          Object.entries(x)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([k, v]) => [k, canonical(v)]),
        )
      : x
export const sameData = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))

// Program item key of an imported component, stable across re-imports.
export const itemKey = (component: string) => `wodify:${norm(component)}`
// The one section holding a day's imported lifts.
export const STRENGTH_KEY = 'wodify-strength'

const num = (s: string) => Number(s.replace(/,/g, ''))
const weightUnit = (u: string): WeightUnit => (u.toLowerCase().startsWith('kg') ? 'kg' : 'lb')
const distanceUnit = (u: string): DistanceUnit =>
  /^mi/i.test(u) ? 'mi' : /^k/i.test(u) ? 'km' : 'm'
// Units we don't store, converted to meters.
const TO_METERS: Record<string, number> = { f: 0.3048, y: 0.9144 }

// "3:49", "1:24.8", "1:02:03" -> seconds
const timeSeconds = (s: string): number | undefined => {
  const m = /^(?:(\d+):)?(\d+):(\d{1,2}(?:\.\d+)?)$/.exec(s)
  if (!m) return undefined
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

type Parsed = { sets: SetFields[]; unit?: WeightUnit | DistanceUnit }

// One "Fully Formatted Result" cell. null = format we don't know yet.
export function parseResult(raw: string): Parsed | null {
  const s = raw.trim()
  let m: RegExpExecArray | null
  if ((m = /^(\d+) x (\d+) @ ([\d.,]+) (lbs?|kgs?)$/i.exec(s))) {
    const set = { reps: num(m[2]), weight: num(m[3]) }
    return {
      sets: Array.from({ length: Math.max(1, num(m[1])) }, () => ({ ...set })),
      unit: weightUnit(m[4]),
    }
  }
  if (/^\d+ Reps? @ /i.test(s)) {
    const sets: SetFields[] = []
    let unit: WeightUnit | undefined
    for (const part of s.split(/,\s*/)) {
      const p = /^(\d+) Reps? @ ([\d.,]+) (lbs?|kgs?)$/i.exec(part)
      if (!p) return null
      sets.push({ reps: num(p[1]), weight: num(p[2]) })
      unit = weightUnit(p[3])
    }
    return { sets, unit }
  }
  const t = timeSeconds(s)
  if (t !== undefined) return { sets: [{ timeSeconds: t }] }
  if ((m = /^(\d+) \+ (\d+)$/.exec(s))) return { sets: [{ rounds: num(m[1]), reps: num(m[2]) }] }
  if ((m = /^([\d,]+) Rounds?$/i.exec(s))) return { sets: [{ rounds: num(m[1]) }] }
  if ((m = /^([\d,]+)(?: Total)? Reps?$/i.exec(s))) return { sets: [{ reps: num(m[1]) }] }
  if ((m = /^([\d.,]+)(?: Total)? Cal(?:orie)?s?$/i.exec(s)))
    return { sets: [{ calories: num(m[1]) }] }
  if ((m = /^([\d.,]+)(?: Total)? (meters?|m|miles?|mi|km|kilometers?)$/i.exec(s))) {
    return { sets: [{ distance: num(m[1]) }], unit: distanceUnit(m[2]) }
  }
  if ((m = /^([\d.,]+)(?: Total)? (feet|foot|ft|yards?|yds?)$/i.exec(s))) {
    const meters = num(m[1]) * TO_METERS[m[2][0].toLowerCase()]
    return { sets: [{ distance: Math.round(meters * 10) / 10 }], unit: 'm' }
  }
  if ((m = /^([\d.,]+) (lbs?|kgs?)$/i.exec(s)))
    return { sets: [{ weight: num(m[1]) }], unit: weightUnit(m[2]) }
  if (/^complete$/i.test(s)) return { sets: [{ done: true }] }
  return null
}

// All rows of one result -> numbered sets. Mixed units fail (needs a human).
// Blank rows are dropped: Wodify "Each Round" exports often put the total on one row, rest empty.
// So are 0 lb sets: Wodify's prefilled lift rows the athlete never touched.
export function parseResults(results: string[]) {
  const sets: MemberSet[] = []
  const warnings: string[] = []
  let unit: WeightUnit | DistanceUnit | undefined
  for (const r of results.filter((x) => x.trim())) {
    const p = parseResult(r)
    if (!p) {
      warnings.push(`Can't read result "${r}"`)
      continue
    }
    if (p.unit && unit && p.unit !== unit) warnings.push(`Mixed units in "${r}"`)
    unit = p.unit ?? unit
    for (const s of p.sets) if (s.weight !== 0) sets.push({ setNumber: sets.length + 1, ...s })
  }
  return { sets, unit, warnings }
}

const NUMERIC = ['reps', 'weight', 'timeSeconds', 'rounds', 'distance', 'calories'] as const

// "0 Total Reps", "0:00", "0 + 0", blank: the athlete was there but didn't score.
export const isEmptyScore = (sets: MemberSet[]) =>
  sets.every((s) => !s.done && NUMERIC.every((k) => !s[k]))

// Per-round sets -> one total set, for score types that aren't perSet.
export function totalSet(sets: MemberSet[]): MemberSet[] {
  if (sets.length <= 1) return sets
  const total: MemberSet = { setNumber: 1 }
  for (const k of NUMERIC) {
    const xs = sets.flatMap((s) => (s[k] === undefined ? [] : [s[k]]))
    if (xs.length) total[k] = k === 'weight' ? Math.max(...xs) : xs.reduce((a, b) => a + b, 0)
  }
  if (sets.some((s) => s.done)) total.done = true
  return [total]
}

// "5x5 @ 70%", "4x2 @ 75-80%", "6x1 @ 90-95+%", "3x3 @ RPE8", "8x1 up to RPE8.5", "3 @ 80%", "5x5"
const REP_LINE =
  /^(?:(\d+)\s*x\s*)?(\d+)(?:\s*(?:@|up to)\s*(RPE)?\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\+?\s*(%)?)?$/i

// Wodify "Rep Scheme" -> one prescription per line; lines we can't structure stay as text
// ("Build to a heavy single", "EMOM10", "*rest 2:00*").
export function parseRepScheme(text: string): Prescription[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = REP_LINE.exec(line)
      // Needs a load unless it's plain "SxR"; RPE and % are exclusive.
      if (!m || (m[4] ? !m[3] === !m[6] : !m[1])) return { customText: line.slice(0, 200) }
      const [low, high] = [m[4] ? Number(m[4]) : undefined, m[5] ? Number(m[5]) : undefined]
      return {
        sets: m[1] ? Number(m[1]) : undefined,
        reps: Number(m[2]),
        ...(m[3] ? { rpe: low, rpeMax: high } : { percentage: low, percentageMax: high }),
      }
    })
}

const mins = (m: string, s = '0') => Number(m) * 60 + Number(s)

// Format + length/cap from a component description (plain text). {} = can't tell.
export function parseFormat(text: string): { format?: MetconFormat; timeCapSec?: number } {
  let m: RegExpExecArray | null
  // "5 sets / 2:00 on//2:00 off": the last rest isn't part of the workout.
  if ((m = /(\d+)\s*(?:sets|rounds)\b[\s\S]*?(\d+):(\d\d)\s*on\s*\/\/?\s*(\d+):(\d\d)\s*off/i.exec(text))) {
    const n = Number(m[1])
    return { format: 'intervals', timeCapSec: n * mins(m[2], m[3]) + (n - 1) * mins(m[4], m[5]) }
  }
  if ((m = /\bE(\d+):(\d\d)\s*x\s*(\d+)/i.exec(text)))
    return { format: 'emom', timeCapSec: mins(m[1], m[2]) * Number(m[3]) }
  if ((m = /\bE\d*MOM\s*(\d+)/i.exec(text))) return { format: 'emom', timeCapSec: mins(m[1]) }
  if ((m = /\bAMRAP\s*(\d+)|(\d+)\s*min(?:ute)?s?\s*AMRAP/i.exec(text)))
    return { format: 'amrap', timeCapSec: mins(m[1] ?? m[2]) }
  if (/for time|\d\s*RFT\b/i.test(text)) {
    m = /(?:time\s*)?cap:?\s*(\d+)(?::(\d\d))?|(\d+)\s*min(?:ute)?s?\s*(?:time\s*)?cap/i.exec(text)
    return { format: 'forTime', timeCapSec: m ? mins(m[1] ?? m[3], m[2]) : undefined }
  }
  return {}
}

// Leaderboard metric; direction comes from the score type's `sort`.
export function sortMetric(sets: MemberSet[]): number | undefined {
  const sum = (k: 'timeSeconds' | 'reps' | 'distance' | 'calories') =>
    sets.reduce((a, s) => a + (s[k] ?? 0), 0)
  const weights = sets.flatMap((s) => (s.weight === undefined ? [] : [s.weight]))
  if (weights.length) return Math.max(...weights)
  if (sets.some((s) => s.timeSeconds !== undefined)) return sum('timeSeconds')
  if (sets.some((s) => s.rounds !== undefined)) {
    return sets.reduce((a, s) => a + (s.rounds ?? 0) * 1000 + (s.reps ?? 0), 0)
  }
  if (sets.some((s) => s.reps !== undefined)) return sum('reps')
  if (sets.some((s) => s.distance !== undefined)) return sum('distance')
  if (sets.some((s) => s.calories !== undefined)) return sum('calories')
  if (sets.some((s) => s.done)) return 1
  return undefined
}

// Score types an import can need; created by wodifyImport.prepare when missing.
// Names match seed.ts where they overlap.
export const SCORE_TYPES = {
  'For Time': { fields: ['timeSeconds'], perSet: false, sort: 'asc' },
  AMRAP: { fields: ['rounds', 'reps'], perSet: false, sort: 'desc' },
  'Each Round': { fields: ['timeSeconds'], perSet: true, sort: 'asc' },
  'Reps per round': { fields: ['reps'], perSet: true, sort: 'desc' },
  'Calories per round': { fields: ['calories'], perSet: true, sort: 'desc' },
  'Distance per round': { fields: ['distance'], perSet: true, sort: 'desc' },
  Checkmark: { fields: ['done'], perSet: false, sort: 'desc' },
  Distance: { fields: ['distance'], perSet: false, sort: 'desc' },
  Calories: { fields: ['calories'], perSet: false, sort: 'desc' },
  Reps: { fields: ['reps'], perSet: false, sort: 'desc' },
  'Weight per set': { fields: ['reps', 'weight'], perSet: true, sort: 'desc' },
} as const satisfies Record<
  string,
  { fields: ScoreField[]; perSet: boolean; sort: 'asc' | 'desc' }
>
export type ScoreTypeName = keyof typeof SCORE_TYPES
export const isScoreTypeName = (s: string): s is ScoreTypeName =>
  Object.prototype.hasOwnProperty.call(SCORE_TYPES, s)

// One athlete's result -> score type. "Each Round" is decided by what was logged
// (Wodify's "N rounds for reps|calories|distance|time" scheme isn't in the export).
// Most Each Round results hold only a total on one row: those are scored as a total.
export function scoreTypeFor(resultType: string, results: string[]): ScoreTypeName | undefined {
  const t = norm(resultType)
  if (t.startsWith('time')) return 'For Time' // incl. "Time ↓ shorter is better" (mis-encoded "?")
  if (t.startsWith('amrap')) return 'AMRAP'
  if (t === 'checkmark') return 'Checkmark'
  if (t === 'distance') return 'Distance'
  if (t === 'calories') return 'Calories'
  if (t === 'weight' || t.startsWith('weightlifting')) return 'Weight per set'
  if (t !== 'each round') return undefined
  const sets = parseResults(results).sets
  const total = results.filter((x) => x.trim()).length === 1
  if (sets.some((x) => x.timeSeconds !== undefined)) return total ? 'For Time' : 'Each Round'
  if (sets.some((x) => x.calories !== undefined)) return total ? 'Calories' : 'Calories per round'
  if (sets.some((x) => x.distance !== undefined)) return total ? 'Distance' : 'Distance per round'
  return total ? 'Reps' : 'Reps per round'
}

export const stripHtml = (s: string) =>
  s
    .replace(/<br\s*\/?>|<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
