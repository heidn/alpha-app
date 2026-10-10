import type { Prescription, ProgramSection } from './domain'

// Dependency-free (server + client). A variant is the fixed amount that makes a result comparable:
// Row · 2000 m and Row · 500 m share a movement but never a leaderboard or PR.
export type FixedUnit = 'm' | 'km' | 'mi' | 'min' | 'cal' | 'reps'
export type Fixed = { amount: number; unit: FixedUnit }

const UNIT_WORDS: Record<string, FixedUnit> = {
  m: 'm',
  meter: 'm',
  meters: 'm',
  metre: 'm',
  metres: 'm',
  km: 'km',
  mi: 'mi',
  mile: 'mi',
  miles: 'mi',
  min: 'min',
  mins: 'min',
  minute: 'min',
  minutes: 'min',
  cal: 'cal',
  cals: 'cal',
  calorie: 'cal',
  calories: 'cal',
  rm: 'reps',
}
const UNIT = '(k|rm|[a-z]+)'
const NUM = '(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)' // 2000, 2,000, 1.5
const LEADING = new RegExp(`^${NUM}[\\s-]*${UNIT}\\b[\\s-]*(.+)$`, 'i')
const TRAILING = new RegExp(`^(.+?)[\\s-]+${NUM}[\\s-]*${UNIT}$`, 'i')

function toFixed(num: string, word: string): Fixed | undefined {
  const w = word.toLowerCase()
  const n = Number(num.replace(/,/g, ''))
  // Rowers' "2k" / "2 km" = 2000 m, so both spellings land on the same variant.
  if (w === 'k' || w === 'km') return { amount: n * 1000, unit: 'm' }
  const unit = UNIT_WORDS[w]
  return unit ? { amount: n, unit } : undefined
}

// "2k row" / "1-Mile Run" / "row 500m" / "20 min bike" → movement name + fixed amount.
export function parseOption(text: string): { name: string; fixed?: Fixed } {
  const t = text.trim()
  const lead = LEADING.exec(t)
  if (lead) {
    const fixed = toFixed(lead[1], lead[2])
    if (fixed) return { name: lead[3].trim(), fixed }
  }
  const trail = TRAILING.exec(t)
  if (trail) {
    const fixed = toFixed(trail[2], trail[3])
    if (fixed) return { name: trail[1].trim(), fixed }
  }
  return { name: t }
}

// Single-movement tests the importer / link pass recognise, → library movement name.
const MOVEMENTS: [RegExp, string][] = [
  [/^(row|rower|row erg|c2 row)$/i, 'Row'],
  [/^(run|running)$/i, 'Run'],
  [/^(bike|bike erg|echo bike|assault bike|air bike|airbike)$/i, 'Bike'],
  [/^(ski|ski erg|skierg)$/i, 'Ski'],
  [/^swim$/i, 'Swim'],
]

// "2k Row" → { movement: 'Row', fixed: 2000 m }; "Karen" / "10 min AMRAP" → undefined.
export function movementTest(name: string): { movement: string; fixed: Fixed } | undefined {
  const { name: rest, fixed } = parseOption(name)
  if (!fixed || fixed.unit === 'reps') return undefined
  const movement = MOVEMENTS.find(([re]) => re.test(rest.trim()))?.[1]
  return movement ? { movement, fixed } : undefined
}

export function toPrescription({ amount, unit }: Fixed): Prescription {
  if (unit === 'min') return { durationSec: Math.round(amount * 60) }
  if (unit === 'cal') return { calories: amount }
  if (unit === 'reps') return { reps: amount }
  return { distance: amount, distanceUnit: unit }
}

export function fixedOf(p: Prescription | undefined): Fixed | undefined {
  if (!p) return undefined
  if (p.distance !== undefined) return { amount: p.distance, unit: p.distanceUnit ?? 'm' }
  if (p.durationSec !== undefined) return { amount: p.durationSec / 60, unit: 'min' }
  if (p.calories !== undefined) return { amount: p.calories, unit: 'cal' }
  if (p.reps !== undefined) return { amount: p.reps, unit: 'reps' }
  return undefined
}

export const fixedLabel = ({ amount, unit }: Fixed) =>
  unit === 'reps' ? `${amount}RM` : `${amount.toLocaleString('en-US')} ${unit}`

// Stored on memberLogs.variant. Test options: their fixed amount (incl. "3RM"). Elsewhere only
// distance / time / calories count; a lift's rep scheme (5x5) isn't a test identity.
export function variantOf(
  section: Pick<ProgramSection, 'kind'>,
  exercise: { prescriptions: Prescription[] },
): string | undefined {
  const fixed = fixedOf(exercise.prescriptions[0])
  if (!fixed || (fixed.unit === 'reps' && section.kind !== 'test')) return undefined
  return fixedLabel(fixed)
}

// "2,000 m" / "1 mi" / "3RM" (a stored variant) → its fixed amount.
export const fixedFromLabel = (label: string) => parseOption(`${label} x`).fixed
