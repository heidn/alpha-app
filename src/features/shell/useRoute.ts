import { useSyncExternalStore } from 'react'

export type Route = 'home' | 'admin'

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

const getRoute = (): Route => (window.location.hash === '#/admin' ? 'admin' : 'home')

export const hrefFor = (route: Route) => (route === 'home' ? '#/' : `#/${route}`)

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getRoute)
}
