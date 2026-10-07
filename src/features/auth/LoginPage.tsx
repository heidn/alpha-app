import { SignInButton, SignUpButton } from '@clerk/react'
import styles from './LoginPage.module.css'

const FEATURES = [
  { title: 'Programs that adapt', body: 'Coaches build plans; athletes see exactly what to lift today.' },
  { title: 'Progress you can see', body: 'Every set logged, every PR celebrated.' },
  { title: 'One team, one place', body: 'Admins, coaches and athletes stay in sync.' },
]

export function LoginPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            α
          </span>
          Alpha Strength
        </div>
        <h1 className={styles.headline}>
          Train with purpose.{' '}
          <span className={styles.highlight}>Get measurably stronger.</span>
        </h1>
        <ul className={styles.features}>
          {FEATURES.map((f) => (
            <li key={f.title}>
              <strong>{f.title}</strong>
              <span>{f.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.panel}>
        <div className={styles.card}>
          <h2>Welcome back</h2>
          <p className={styles.muted}>Sign in to see your training.</p>
          <SignInButton mode="modal">
            <button type="button" className={styles.primary}>
              Sign in
            </button>
          </SignInButton>
          <div className={styles.divider}>
            <span>New here?</span>
          </div>
          <SignUpButton mode="modal">
            <button type="button" className={styles.secondary}>
              Create an account
            </button>
          </SignUpButton>
        </div>
      </section>
    </div>
  )
}
