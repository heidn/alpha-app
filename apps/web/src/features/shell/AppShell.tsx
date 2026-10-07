import { UserButton } from '@clerk/react'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { AdminPage } from '../admin/AdminPage.tsx'
import { useStoreUser } from '../auth/useStoreUser.ts'
import { ClassPage } from '../classes/ClassPage.tsx'
import { GymPage } from '../gyms/GymPage.tsx'
import { GymsPage } from '../gyms/GymsPage.tsx'
import { HomePage } from '../home/HomePage.tsx'
import { LibraryPage } from '../library/LibraryPage.tsx'
import { OnboardingPage } from '../onboarding/OnboardingPage.tsx'
import { WorkoutEditorPage } from '../workouts/WorkoutEditorPage.tsx'
import { WorkoutsPage } from '../workouts/WorkoutsPage.tsx'
import styles from './AppShell.module.css'
import { hrefFor, useRoute, type Route } from './useRoute.ts'

// Nav section a route belongs to (detail pages highlight their list).
const SECTION: Record<Route['name'], Route['name']> = {
  home: 'home',
  admin: 'admin',
  gyms: 'gyms',
  gym: 'gyms',
  class: 'gyms',
  library: 'library',
  workouts: 'workouts',
  workout: 'workouts',
}

export function AppShell() {
  useStoreUser()
  const route = useRoute()
  const me = useQuery(api.users.current)
  const isAdmin = me?.role === 'admin'
  const isStaff = isAdmin || me?.role === 'coach'

  const links: { route: Route; label: string; show: boolean }[] = [
    { route: { name: 'home' }, label: 'Home', show: true },
    { route: { name: 'gyms' }, label: 'Gyms', show: isStaff },
    { route: { name: 'workouts' }, label: 'Workouts', show: isStaff },
    { route: { name: 'library' }, label: 'Library', show: isStaff },
    { route: { name: 'admin' }, label: 'Users', show: isAdmin },
  ]
  // Profile (gender drives Rx) is required first. null = store() not finished yet.
  const needsOnboarding = me != null && !me.gender
  const forbidden = <p className={styles.forbidden}>You don’t have access to this page.</p>

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main">
          <a href={hrefFor({ name: 'home' })} className={styles.brand}>
            <span className={styles.logo} aria-hidden>
              α
            </span>
            <span className={styles.brandText}>Alpha Strength</span>
          </a>
          <ul className={styles.links}>
            {links
              .filter((l) => l.show && !needsOnboarding)
              .map((l) => (
                <li key={l.route.name}>
                  <a
                    href={hrefFor(l.route)}
                    className={styles.link}
                    aria-current={SECTION[route.name] === l.route.name ? 'page' : undefined}
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
        {me == null ? null : needsOnboarding ? (
          <OnboardingPage user={me} />
        ) : route.name === 'home' ? (
          <HomePage role={me.role} />
        ) : !isStaff || (route.name === 'admin' && !isAdmin) ? (
          forbidden
        ) : route.name === 'admin' ? (
          <AdminPage currentUserId={me._id} />
        ) : route.name === 'gyms' ? (
          <GymsPage isAdmin={isAdmin} />
        ) : route.name === 'gym' ? (
          <GymPage id={route.id} isAdmin={isAdmin} />
        ) : route.name === 'class' ? (
          <ClassPage id={route.id} />
        ) : route.name === 'library' ? (
          <LibraryPage isAdmin={isAdmin} />
        ) : route.name === 'workouts' ? (
          <WorkoutsPage />
        ) : route.name === 'workout' ? (
          <WorkoutEditorPage id={route.id} />
        ) : null}
      </main>
    </div>
  )
}
