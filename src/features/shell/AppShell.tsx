import { UserButton } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { AdminPage } from '../admin/AdminPage.tsx'
import { useStoreUser } from '../auth/useStoreUser.ts'
import { HomePage } from '../home/HomePage.tsx'
import styles from './AppShell.module.css'
import { hrefFor, useRoute, type Route } from './useRoute.ts'

export function AppShell() {
  useStoreUser()
  const route = useRoute()
  const me = useQuery(api.users.current)
  const isAdmin = me?.role === 'admin'

  const links: { route: Route; label: string }[] = [
    { route: 'home', label: 'Home' },
    ...(isAdmin ? [{ route: 'admin' as const, label: 'Users' }] : []),
  ]

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main">
          <a href={hrefFor('home')} className={styles.brand}>
            <span className={styles.logo} aria-hidden>
              α
            </span>
            <span className={styles.brandText}>Alpha Strength</span>
          </a>
          <ul className={styles.links}>
            {links.map((l) => (
              <li key={l.route}>
                <a
                  href={hrefFor(l.route)}
                  className={styles.link}
                  aria-current={route === l.route ? 'page' : undefined}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className={styles.profile}>
            <UserButton />
          </div>
        </nav>
      </header>
      <main className={styles.main}>
        {route === 'admin' ? (
          me === undefined ? null : isAdmin && me ? (
            <AdminPage currentUserId={me._id} />
          ) : (
            <p className={styles.forbidden}>You don’t have access to this page.</p>
          )
        ) : (
          <HomePage role={me?.role} />
        )}
      </main>
    </div>
  )
}
