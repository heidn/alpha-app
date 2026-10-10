import ui from '../ui/ui.module.css'
import styles from './SetupNav.module.css'
import { hrefFor, type Route } from './useRoute.ts'

// Sub-nav for the Setup section: gym (classes, staff), users and imports.
export function SetupNav({ route, isAdmin }: { route: Route; isAdmin: boolean }) {
  const items: { route: Route; label: string; active: boolean; show: boolean }[] = [
    {
      route: { name: 'gyms' },
      label: 'Gyms & classes',
      active: route.name === 'gyms' || route.name === 'gym' || route.name === 'class',
      show: true,
    },
    { route: { name: 'admin' }, label: 'Users', active: route.name === 'admin', show: isAdmin },
    { route: { name: 'imports' }, label: 'Imports', active: route.name === 'imports', show: isAdmin },
  ]
  return (
    <nav className={`${ui.tabs} ${styles.nav}`} aria-label="Setup">
      {items
        .filter((i) => i.show)
        .map((i) => (
          <a
            key={i.route.name}
            href={hrefFor(i.route)}
            className={`${ui.tab} ${styles.item}`}
            aria-current={i.active ? 'page' : undefined}
          >
            {i.label}
          </a>
        ))}
    </nav>
  )
}
