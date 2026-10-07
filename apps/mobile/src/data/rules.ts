// Handoff §4. Pure functions; Today and Personal record must agree, so both go through trainingMax().
import { daysBetween, formatDuration } from './dates'
import type { ISODate, LiftResult, MetconItem, MetconPart, MetconResult, MetconScore, TestedMax, Workout } from './types'

export const PROJECTION_WINDOW_DAYS = 56
export const ACTUAL_FRESH_DAYS = 90

export const roundTo = (weight: number, step: number) => Math.round(weight / step) * step

/** Epley estimate of a 1RM from one set. */
export const epley = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30))

export type LiftHistoryEntry = { date: ISODate; percent: number; result: LiftResult }

export type Results = Record<string, LiftResult | MetconResult | undefined>

export const resultKey = (workoutId: string, part: 'lift' | 'metcon') => `${workoutId}:${part}`

export function liftHistory(movementId: string, workouts: Workout[], results: Results): LiftHistoryEntry[] {
  const out: LiftHistoryEntry[] = []
  for (const w of workouts) {
    if (w.lift?.movementId !== movementId) continue
    const r = results[resultKey(w.id, 'lift')]
    if (r?.kind === 'lift') out.push({ date: w.date, percent: w.lift.percent, result: r })
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function projectedMax(history: LiftHistoryEntry[], today: ISODate, step: number): number | undefined {
  let best = 0
  for (const h of history) {
    const age = daysBetween(h.date, today)
    if (age < 0 || age > PROJECTION_WINDOW_DAYS) continue
    for (const s of h.result.sets) best = Math.max(best, epley(s.weight, s.reps))
  }
  return best ? roundTo(best, step) : undefined
}

/** Heaviest tested max or logged single. Users never type this. */
export function actualMax(
  movementId: string,
  history: LiftHistoryEntry[],
  tested: TestedMax[],
): { weight: number; date: ISODate } | undefined {
  let best: { weight: number; date: ISODate } | undefined
  const consider = (weight: number, date: ISODate) => {
    if (!best || weight > best.weight) best = { weight, date }
  }
  for (const t of tested) if (t.movementId === movementId) consider(t.weight, t.achievedAt)
  for (const h of history) for (const s of h.result.sets) if (s.reps === 1) consider(s.weight, h.date)
  return best
}

export type TrainingMax = { weight: number; source: 'actual' | 'projected' }

/** Actual 1RM if lifted in the last ~90 days, else projected. */
export function trainingMax(
  actual: { weight: number; date: ISODate } | undefined,
  projected: number | undefined,
  today: ISODate,
): TrainingMax | undefined {
  if (actual && daysBetween(actual.date, today) <= ACTUAL_FRESH_DAYS) return { weight: actual.weight, source: 'actual' }
  if (projected) return { weight: projected, source: 'projected' }
  if (actual) return { weight: actual.weight, source: 'actual' }
  return undefined
}

export const percentOf = (max: number, percent: number, step: number) => roundTo((max * percent) / 100, step)

/** Top-set weight from the most recent earlier session programmed at the same percent. */
export function lastAtPercent(history: LiftHistoryEntry[], percent: number, before: ISODate): number | undefined {
  const hit = history.find((h) => h.percent === percent && h.date < before)
  return hit ? topSet(hit.result).weight : undefined
}

export function topSet(r: LiftResult) {
  return r.sets.reduce((a, b) => (b.weight > a.weight ? b : a), r.sets[0])
}

/** Total reps in one AMRAP round (used to cap the reps input). */
export const repsPerRound = (metcon: MetconPart) => metcon.items.reduce((sum, i) => sum + (i.reps ?? 0), 0)

export const METCON_LABEL: Record<MetconPart['type'], string> = {
  amrap: 'AMRAP',
  forTime: 'For time',
  emom: 'EMOM',
  maxLoad: 'Max load',
  other: 'Metcon',
}

export function scoreText(score: MetconScore): string {
  switch (score.kind) {
    case 'amrap':
      return `${score.rounds} + ${score.reps}`
    case 'forTime':
      return score.cappedReps !== undefined ? `CAP + ${score.cappedReps}` : formatDuration(score.timeSec ?? 0)
    case 'emom':
      return score.done ? 'Done' : 'Not done'
    case 'maxLoad':
      return `${score.load} lb`
  }
}

export const divisionText = (d: MetconResult['division']) => (d === 'rx' ? 'Rx' : 'Scaled')

/** "50 lb · 20″ box" using the user's Rx weight preference. */
export function metconLoad(item: MetconItem, rx: 'heavy' | 'light'): string | undefined {
  const w = rx === 'heavy' ? item.rxHeavy : (item.rxLight ?? item.rxHeavy)
  const parts = [w !== undefined ? `${w} lb` : undefined, item.spec].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
}
