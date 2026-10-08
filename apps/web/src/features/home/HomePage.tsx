import { useUser } from '@clerk/react'
import type { Role } from '../../../../../convex/roles'
import { RoleBadge } from '../admin/RoleBadge.tsx'
import styles from './HomePage.module.css'

type Card = { title: string; body: string; href?: string }

const CARDS: Record<Role, Card[]> = {
  athlete: [
    { title: 'Today’s workout', body: 'Your coach hasn’t assigned a session yet.' },
    { title: 'Personal records', body: 'Log a lift to start tracking PRs.' },
    { title: 'Schedule', body: 'Upcoming classes will show up here.' },
  ],
  coach: [
    { title: 'My athletes', body: 'Athletes assigned to you will appear here.' },
    { title: 'Programs', body: 'Build and assign training blocks.' },
    { title: 'Schedule', body: 'Your upcoming sessions.' },
  ],
  admin: [
    { title: 'Users', body: 'Manage people and their roles.', href: '#/admin' },
    { title: 'Coaches', body: 'Assign coaches to athletes.' },
    { title: 'Schedule', body: 'Gym-wide classes and sessions.' },
  ],
}

export function HomePage({ role }: { role: Role | undefined }) {
  const { user } = useUser()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Welcome{user?.firstName ? `, ${user.firstName}` : ''}</h1>
          <p className={styles.sub}>Here’s what’s happening at Alpha Strength.</p>
        </div>
        {role && <RoleBadge role={role} />}
      </header>
      <div className={styles.grid}>
        {CARDS[role ?? 'athlete'].map((c) => {
          const content = (
            <>
              <h2>{c.title}</h2>
              <p>{c.body}</p>
              {!c.href && <span className={styles.soon}>Coming soon</span>}
            </>
          )
          return c.href ? (
            <a key={c.title} href={c.href} className={`${styles.card} ${styles.linkCard}`}>
              {content}
            </a>
          ) : (
            <div key={c.title} className={styles.card}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
