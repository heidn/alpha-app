import type { Prescription } from '../../../convex/domain'

export const newKey = () => crypto.randomUUID()

export function move<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}

export const replaceAt = <T>(list: T[], index: number, item: T) =>
  list.map((x, i) => (i === index ? item : x))

export const removeAt = <T>(list: T[], index: number) => list.filter((_, i) => i !== index)

export const emptyPrescription = (): Prescription => ({ sets: 1 })

// "YYYY-MM-DD" in the viewer's local time.
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Monday-start week containing `base` + offset weeks.
export function weekDays(base: Date, offset: number): Date[] {
  const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}
