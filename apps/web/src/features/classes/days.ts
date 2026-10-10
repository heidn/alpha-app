import type { Release } from '../../../../../convex/domain'

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export const formatDays = (days: number[]) => {
  const key = days.join()
  if (key === '1,2,3,4,5') return 'Mon–Fri'
  if (key === '0,1,2,3,4,5,6') return 'Every day'
  return days.map((d) => DAY_SHORT[d]).join(', ')
}

// "20:00" → "8:00 PM"
export const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export const formatTimes = (times: string[]) => times.map(formatTime).join(', ')

export const formatRelease = (release: Release | undefined) =>
  !release
    ? 'As soon as saved'
    : `${release.day === 'before' ? 'Night before' : 'Day of'} at ${formatTime(release.time)}`
