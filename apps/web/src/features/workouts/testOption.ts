import { fixedLabel, type Fixed, type FixedUnit } from '../../../../../convex/variants'
import { typeNamed } from './program.ts'
import type { Score, ScoreTypeOption } from './ScoreControl.tsx'

export {
  fixedLabel,
  fixedOf,
  parseOption,
  toPrescription,
  type Fixed,
  type FixedUnit,
} from '../../../../../convex/variants'

export const FIXED_UNITS: { value: FixedUnit; label: string }[] = [
  { value: 'm', label: 'm' },
  { value: 'km', label: 'km' },
  { value: 'mi', label: 'mi' },
  { value: 'min', label: 'min' },
  { value: 'cal', label: 'cal' },
  { value: 'reps', label: 'RM' },
]

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
