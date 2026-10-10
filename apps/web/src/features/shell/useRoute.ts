import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'admin' }
  | { name: 'gyms' }
  | { name: 'gym'; id: string }
  | { name: 'class'; id: string }
  | { name: 'library' }
  | { name: 'workouts' }
  | { name: 'workout'; id: string }
  | { name: 'imports' }
  | { name: 'leaderboard'; date?: string }

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

const parse = (hash: string): Route => {
  const [a, b] = hash.replace(/^#\/?/, '').split('/')
  if (a === 'admin') return { name: 'admin' }
  if (a === 'library') return { name: 'library' }
  if (a === 'gyms') return b ? { name: 'gym', id: b } : { name: 'gyms' }
  if (a === 'classes' && b) return { name: 'class', id: b }
  if (a === 'imports') return { name: 'imports' }
  if (a === 'leaderboard') return { name: 'leaderboard', date: b || undefined }
  if (a === 'workouts') return b ? { name: 'workout', id: b } : { name: 'workouts' }
  return { name: 'home' }
}

export const hrefFor = (route: Route): string => {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'gym':
      return `#/gyms/${route.id}`
    case 'class':
      return `#/classes/${route.id}`
    case 'workout':
      return `#/workouts/${route.id}`
    case 'leaderboard':
      return route.date ? `#/leaderboard/${route.date}` : '#/leaderboard'
    default:
      return `#/${route.name}`
  }
}

export const navigate = (route: Route) => {
  window.location.hash = hrefFor(route)
}

// Snapshot must be stable between renders, so subscribe to the hash string and parse after.
export function useRoute(): Route {
  return parse(useSyncExternalStore(subscribe, () => window.location.hash))
}
