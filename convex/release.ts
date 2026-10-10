import { ConvexError } from 'convex/values'
import type { Release } from './domain'

export const DEFAULT_TIME_ZONE = 'America/Chicago'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function checkTime(time: string, label = 'Time') {
  if (!TIME_RE.test(time)) throw new ConvexError(`${label} must be HH:MM`)
  return time
}

export function checkTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
  } catch {
    throw new ConvexError(`Unknown time zone: ${timeZone}`)
  }
  return timeZone
}

// Wall-clock time of `ms` in `timeZone`, re-read as if it were UTC.
function wallAsUtc(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(ms)
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'))
}

// Epoch ms of local `date` ("YYYY-MM-DD") at `time` ("HH:MM") in `timeZone`.
function zonedToEpoch(date: string, time: string, timeZone: string) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const wall = Date.UTC(y, m - 1, d, hh, mm)
  // Offset at the guess, then again at the result in case a DST change sits in between.
  let ms = wall - (wallAsUtc(wall, timeZone) - wall)
  ms = wall - (wallAsUtc(ms, timeZone) - ms)
  return ms
}

// When athletes can see the workout for `date`. undefined = no schedule (visible once saved).
export function releaseAt(date: string, release: Release | undefined, timeZone: string | undefined) {
  if (!release) return undefined
  const day = new Date(`${date}T00:00:00Z`)
  if (release.day === 'before') day.setUTCDate(day.getUTCDate() - 1)
  return zonedToEpoch(day.toISOString().slice(0, 10), release.time, timeZone ?? DEFAULT_TIME_ZONE)
}
