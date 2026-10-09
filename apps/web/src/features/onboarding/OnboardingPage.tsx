import { useMutation } from 'convex/react'
import { useState, type FormEvent } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Doc } from '../../../../../convex/_generated/dataModel'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import styles from './OnboardingPage.module.css'

type Gender = NonNullable<Doc<'users'>['gender']>

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export function OnboardingPage({ user }: { user: Doc<'users'> }) {
  const completeProfile = useMutation(api.users.completeProfile)
  const { run, pending, error, clearError } = useRun()
  const [firstName, setFirstName] = useState(user.firstName ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const [gender, setGender] = useState<Gender | null>(user.gender ?? null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!gender) return
    void run(() => completeProfile({ firstName, lastName, gender }))
  }

  return (
    <div className={`${ui.page} ${styles.page}`}>
      <header>
        <h1>Set up your profile</h1>
        <p className={ui.sub}>We use this to show the right Rx weights for your workouts.</p>
      </header>
      <ErrorBanner error={error} onDismiss={clearError} />
      <form className={`${ui.card} ${ui.form}`} onSubmit={submit}>
        <div className={ui.row}>
          <label className={ui.field}>
            First name
            <input
              required
              maxLength={50}
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className={ui.field}>
            Last name
            <input
              required
              maxLength={50}
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>
        <fieldset className={styles.choices}>
          <legend className={styles.legend}>Gender</legend>
          {GENDERS.map((g) => (
            <label key={g.value} className={styles.choice}>
              <input
                type="radio"
                name="gender"
                required
                value={g.value}
                checked={gender === g.value}
                onChange={() => setGender(g.value)}
              />
              {g.label}
            </label>
          ))}
        </fieldset>
        <div className={ui.formActions}>
          <button
            type="submit"
            className={ui.btnPrimary}
            disabled={pending || !gender}
            title={!gender ? 'Choose a gender to continue' : undefined}
          >
            {pending ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  )
}
