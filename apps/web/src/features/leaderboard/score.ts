import type { MemberSet } from '../../../../../convex/domain'

export function formatTime(totalSeconds: number) {
  const s = Math.round(totalSeconds * 10) / 10
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(Math.floor(s % 60)).padStart(2, '0') + (s % 1 ? `.${Math.round((s % 1) * 10)}` : '')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

const sum = (sets: MemberSet[], k: 'reps' | 'timeSeconds' | 'distance' | 'calories') =>
  sets.reduce((a, s) => a + (s[k] ?? 0), 0)
const has = (sets: MemberSet[], k: keyof MemberSet) => sets.some((s) => s[k] !== undefined)

// The ranked number, in the same order of precedence as the stored sortValue
// (weight, time, rounds + reps, reps, distance, calories, done).
export function formatScore(sets: MemberSet[], unit?: string) {
  if (has(sets, 'weight')) return `${Math.max(...sets.map((s) => s.weight ?? 0))} ${unit ?? 'lb'}`
  if (has(sets, 'timeSeconds')) return formatTime(sum(sets, 'timeSeconds'))
  if (has(sets, 'rounds')) return `${sets.reduce((a, s) => a + (s.rounds ?? 0), 0)} + ${sum(sets, 'reps')}`
  if (has(sets, 'reps')) return `${sum(sets, 'reps')} reps`
  if (has(sets, 'distance')) return `${sum(sets, 'distance')} ${unit ?? 'm'}`
  if (has(sets, 'calories')) return `${sum(sets, 'calories')} cal`
  if (has(sets, 'done')) return 'Done'
  return '–'
}

function formatSet(s: MemberSet, unit?: string) {
  if (s.weight !== undefined) return `${s.reps ?? 1}×${s.weight}`
  if (s.timeSeconds !== undefined) return formatTime(s.timeSeconds)
  if (s.calories !== undefined) return `${s.calories} cal`
  if (s.distance !== undefined) return `${s.distance} ${unit ?? 'm'}`
  return s.reps !== undefined ? String(s.reps) : ''
}

// Per-set breakdown shown under the score, only when there's more than one set.
export const formatSets = (sets: MemberSet[], unit?: string) =>
  sets.length > 1 ? sets.map((s) => formatSet(s, unit)).join(' · ') : ''
