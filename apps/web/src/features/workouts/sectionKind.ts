import type { MetconFormat, ProgramSection, SectionKind } from '../../../../../convex/domain'
import { typeNamed } from './program.ts'
import type { Score, ScoreTypeOption } from './ScoreControl.tsx'
import { fixedOf, optionScore } from './testOption.ts'

export const KINDS: { value: SectionKind; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'metcon', label: 'Metcon' },
  { value: 'test', label: 'Pick-one test' },
  { value: 'notes', label: 'Notes only' },
]

export const isKind = (v: string): v is SectionKind => KINDS.some((k) => k.value === v)

// New sections get a type from their library title; anything else stays Standard.
export function kindForTitle(title: string): SectionKind | undefined {
  if (/metcon|wod|conditioning|finisher/i.test(title)) return 'metcon'
  if (/strength|lift|weightlifting|accessor/i.test(title)) return 'strength'
  if (/warm|cool|mobility|stretch|note/i.test(title)) return 'notes'
  return undefined
}

// Results a metcon format can be scored by (score type names), best first.
const METCON_RESULTS: Record<MetconFormat, string[]> = {
  forTime: ['For Time'],
  amrap: ['AMRAP', 'Reps'],
  emom: ['Checkmark', 'Reps', 'Each Round'],
  intervals: ['Each Round', 'For Time'],
}
export const metconResults = (types: ScoreTypeOption[], format: MetconFormat) =>
  METCON_RESULTS[format].flatMap((n) => typeNamed(types, n) ?? [])

export const STRENGTH_RESULTS = ['Weight per set', 'Max load', 'Reps', 'Checkmark']
export const strengthResults = (types: ScoreTypeOption[]) =>
  STRENGTH_RESULTS.flatMap((n) => typeNamed(types, n) ?? [])

// A short result list plus the item's current type when it isn't on it (e.g. a Wodify import).
export function withCurrent(list: ScoreTypeOption[], all: ScoreTypeOption[], id?: string) {
  const cur = id && !list.some((t) => t._id === id) ? all.find((t) => t._id === id) : undefined
  return cur ? [...list, cur] : list
}

type Ctx = { types: ScoreTypeOption[]; names: Record<string, string>; title: string }

const scoreOf = (t: ScoreTypeOption | undefined, title: string): Score | undefined =>
  t && { scoreTypeId: t._id, title }

// Switch a section's type, keeping what still fits: Metcon scores the section, Strength and
// test options score exercises, Notes scores nothing. Standard (undefined) leaves it as is.
export function toKind(s: ProgramSection, kind: SectionKind | undefined, c: Ctx): ProgramSection {
  const bare = { ...s, kind, score: undefined, format: undefined, timeCapSec: undefined }
  const unscored = s.exercises.map((e) => ({ ...e, score: undefined }))
  switch (kind) {
    case 'metcon': {
      const format = s.format ?? 'forTime'
      const allowed = metconResults(c.types, format)
      const keep = allowed.find((t) => t._id === s.score?.scoreTypeId)
      return {
        ...s,
        kind,
        format,
        score: scoreOf(keep ?? allowed[0], c.title),
        exercises: unscored,
      }
    }
    case 'strength': {
      const lift = strengthResults(c.types)[0]
      const exercises = s.exercises.map((e) => ({
        ...e,
        score: e.score ?? scoreOf(lift, c.names[e.exerciseId] ?? ''),
      }))
      return { ...bare, exercises }
    }
    case 'test': {
      const exercises = s.exercises.map((e) => ({
        ...e,
        score: optionScore(
          c.types,
          fixedOf(e.prescriptions[0]),
          c.names[e.exerciseId] ?? '',
          e.score,
        ),
      }))
      return { ...bare, exercises }
    }
    case 'notes':
      return { ...bare, exercises: unscored }
    default:
      return { ...s, kind: undefined }
  }
}
