export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export const formatDays = (days: number[]) => {
  const key = days.join()
  if (key === '1,2,3,4,5') return 'Mon–Fri'
  if (key === '0,1,2,3,4,5,6') return 'Every day'
  return days.map((d) => DAY_SHORT[d]).join(', ')
}
