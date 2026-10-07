import type { ISODate } from './types'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): ISODate {
  return toISO(new Date())
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000)
}

export const monthName = (month: number) => MONTHS[month]

/** "Thu · Oct 1" */
export function dayTitle(iso: ISODate): string {
  const d = fromISO(iso)
  return `${DOW[d.getDay()]} · ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}

/** "May 12, 2026" */
export function longDate(iso: ISODate): string {
  const d = fromISO(iso)
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`
}

/** "06:00" -> "6:00 AM" */
export function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  return `${h % 12 || 12}:${pad(m)} ${suffix}`
}

/** Mon-first grid for a month: leading blanks (null) then ISO dates. */
export function monthGrid(year: number, month: number): (ISODate | null)[] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (ISODate | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= days; d++) cells.push(toISO(new Date(year, month, d)))
  return cells
}

/** 754 -> "12:34" */
export function formatDuration(sec: number): string {
  return `${Math.floor(sec / 60)}:${pad(sec % 60)}`
}
