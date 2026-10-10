import { UserButton } from '@clerk/react'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { AdminPage } from '../admin/AdminPage.tsx'
import { useStoreUser } from '../auth/useStoreUser.ts'
import { ClassPage } from '../classes/ClassPage.tsx'
import { GymPage } from '../gyms/GymPage.tsx'
import { GymsPage } from '../gyms/GymsPage.tsx'
import { HistoryPage } from '../history/HistoryPage.tsx'
import { HomePage } from '../home/HomePage.tsx'
import { WodifyImportPage } from '../imports/WodifyImportPage.tsx'
import { LeaderboardPage } from '../leaderboard/LeaderboardPage.tsx'
import { LibraryPage } from '../library/LibraryPage.tsx'
import { OnboardingPage } from '../onboarding/OnboardingPage.tsx'
import { WorkoutEditorPage } from '../workouts/WorkoutEditorPage.tsx'
import { WorkoutsPage } from '../workouts/WorkoutsPage.tsx'
import styles from './AppShell.module.css'
import { SetupNav } from './SetupNav.tsx'
import { hrefFor, useRoute, type Route } from './useRoute.ts'

// Nav section a route belongs to (detail pages highlight their list). Setup = gyms link.
const SECTION: Record<Route['name'], Route['name']> = {
  home: 'workouts', // staff land on Program
  admin: 'gyms',
  gyms: 'gyms',
  gym: 'gyms',
  class: 'gyms',
  library: 'library',
  workouts: 'workouts',
  workout: 'workouts',
  imports: 'gyms',
  leaderboard: 'workouts',
  history: 'workouts',
}

export function AppShell() {
  useStoreUser()
  const route = useRoute()
  const me = useQuery(api.users.current)
  const isAdmin = me?.role === 'admin'
  const isStaff = isAdmin || me?.role === 'coach'

  const links: { route: Route; label: string; show: boolean }[] = [
    { route: { name: 'home' }, label: 'Home', show: !isStaff },
    { route: { name: 'workouts' }, label: 'Program', show: isStaff },
    { route: { name: 'library' }, label: 'Library', show: isStaff },
    { route: { name: 'gyms' }, label: 'Setup', show: isStaff },
  ]
  const section = isStaff ? SECTION[route.name] : route.name
  const inSetup = isStaff && section === 'gyms'
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
                    aria-current={section === l.route.name ? 'page' : undefined}
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
        {inSetup && !needsOnboarding && <SetupNav route={route} isAdmin={isAdmin} />}
        {me == null ? null : needsOnboarding ? (
          <OnboardingPage user={me} />
        ) : route.name === 'home' && !isStaff ? (
          <HomePage role={me.role} />
        ) : !isStaff || ((route.name === 'admin' || route.name === 'imports') && !isAdmin) ? (
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
        ) : route.name === 'workouts' || route.name === 'home' ? (
          <WorkoutsPage />
        ) : route.name === 'workout' ? (
          <WorkoutEditorPage id={route.id} />
        ) : route.name === 'leaderboard' ? (
          <LeaderboardPage date={route.date} />
        ) : route.name === 'history' ? (
          <HistoryPage key={`${route.userId}/${route.exerciseId}`} {...route} />
        ) : route.name === 'imports' ? (
          <WodifyImportPage />
        ) : null}
      </main>
    </div>
  )
}
