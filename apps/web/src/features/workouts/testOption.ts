import type { Prescription } from '../../../../../convex/domain'
import { typeNamed } from './program.ts'
import type { Score, ScoreTypeOption } from './ScoreControl.tsx'

// A test option = movement + one fixed amount; the athlete's score measures the other thing.
export type FixedUnit = 'm' | 'km' | 'mi' | 'min' | 'cal' | 'reps'
export type Fixed = { amount: number; unit: FixedUnit }

export const FIXED_UNITS: { value: FixedUnit; label: string }[] = [
  { value: 'm', label: 'm' },
  { value: 'km', label: 'km' },
  { value: 'mi', label: 'mi' },
  { value: 'min', label: 'min' },
  { value: 'cal', label: 'cal' },
  { value: 'reps', label: 'RM' },
]

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
  unit === 'reps' ? `${amount}RM` : `${amount.toLocaleString()} ${unit}`

// Score type names (seeded / Wodify) the option is measured with, best first.
export function measuredBy(fixed: Fixed | undefined): string[] {
  if (fixed?.unit === 'min') return ['Distance', 'Calories', 'Reps']
  if (fixed?.unit === 'reps') return ['Max load']
  return ['For Time']
}

export const measures = (types: ScoreTypeOption[], fixed: Fixed | undefined) =>
  measuredBy(fixed).flatMap((n) => typeNamed(types, n) ?? [])

// Option score: keeps a still-valid score type, else the best one for its fixed amount.
export function optionScore(
  types: ScoreTypeOption[],
  fixed: Fixed | undefined,
  name: string,
  current?: Score,
): Score | undefined {
  const allowed = measures(types, fixed)
  const t = allowed.find((x) => x._id === current?.scoreTypeId) ?? allowed[0]
  return (
    t && {
      scoreTypeId: t._id,
      title: fixed ? `${fixedLabel(fixed)} ${name}` : name,
    }
  )
}
