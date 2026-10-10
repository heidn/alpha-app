import type { MemberSet } from '../../../../../convex/domain'
import { fixedFromLabel } from '../../../../../convex/variants'

const METERS = { m: 1, km: 1000, mi: 1609.344 } as const
type DistUnit = keyof typeof METERS
const isDist = (u: string | undefined): u is DistUnit => u === 'm' || u === 'km' || u === 'mi'

export type PaceUnit = '500 m' | 'mi'
const PER: Record<PaceUnit, number> = { '500 m': 500, mi: METERS.mi }

const total = (sets: MemberSet[], k: 'timeSeconds' | 'distance') =>
  sets.reduce((a, s) => a + (s[k] ?? 0), 0)

// Seconds + meters behind one result: a fixed distance done for time, or a fixed time for distance.
function effort(variant: string | null, sets: MemberSet[], unit?: string) {
  const fixed = variant ? fixedFromLabel(variant) : undefined
  if (fixed && isDist(fixed.unit)) {
    const sec = total(sets, 'timeSeconds')
    return sec > 0 ? { sec, meters: fixed.amount * METERS[fixed.unit] } : undefined
  }
  if (fixed?.unit === 'min') {
    const meters = total(sets, 'distance') * METERS[isDist(unit) ? unit : 'm']
    return meters > 0 ? { sec: fixed.amount * 60, meters } : undefined
  }
  return undefined
}

// Runs are paced per mile, everything else (row, ski, bike) per 500 m.
export const paceUnitFor = (variants: (string | null)[]): PaceUnit =>
  variants.some((v) => v && fixedFromLabel(v)?.unit === 'mi') ? 'mi' : '500 m'

export function paceOf(
  variant: string | null,
  sets: MemberSet[],
  unit: string | undefined,
  per: PaceUnit,
): number | undefined {
  const e = effort(variant, sets, unit)
  return e && (e.sec / e.meters) * PER[per]
}
