import { useUser } from '@clerk/react'
import { useMutation } from 'convex/react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Doc } from '../../../../../convex/_generated/dataModel'
import { Avatar } from '../ui/Avatar.tsx'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import styles from './OnboardingPage.module.css'

type Gender = NonNullable<Doc<'users'>['gender']>

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

const MAX_PHOTO_MB = 5

export function OnboardingPage({ user }: { user: Doc<'users'> }) {
  const completeProfile = useMutation(api.users.completeProfile)
  const { user: clerkUser } = useUser()
  const { run, pending, error, clearError, setError } = useRun()
  const [firstName, setFirstName] = useState(user.firstName ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const [gender, setGender] = useState<Gender | null>(user.gender ?? null)
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null)

  useEffect(() => {
    if (photo) return () => URL.revokeObjectURL(photo.preview)
  }, [photo])

  const pickPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // picking the same file again still fires
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Choose an image file (JPG or PNG).')
    if (file.size > MAX_PHOTO_MB * 1024 * 1024)
      return setError(`Photos can be up to ${MAX_PHOTO_MB} MB.`)
    clearError()
    setPhoto({ file, preview: URL.createObjectURL(file) })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!gender) return
    void run(async () => {
      // Photo goes to Clerk; useStoreUser copies its URL to Convex once Clerk reports it.
      if (photo && clerkUser) {
        await clerkUser.setProfileImage({ file: photo.file })
        await clerkUser.reload()
      }
      await completeProfile({ firstName, lastName, gender })
    })
  }

  const shown = photo?.preview ?? (clerkUser?.hasImage ? clerkUser.imageUrl : undefined)

  return (
    <div className={`${ui.page} ${styles.page}`}>
      <header>
        <h1>Set up your profile</h1>
        <p className={ui.sub}>We use this to show the right Rx weights for your workouts.</p>
      </header>
      <ErrorBanner error={error} onDismiss={clearError} />
      <form className={`${ui.card} ${ui.form}`} onSubmit={submit}>
        <div className={styles.photo}>
          <Avatar name={`${firstName} ${lastName}`.trim() || user.name} imageUrl={shown} size={64} />
          <div>
            <label className={`${ui.btn} ${styles.photoButton}`}>
              {shown ? 'Change photo' : 'Add photo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="visually-hidden"
                onChange={pickPhoto}
              />
            </label>
            {photo && (
              <button type="button" className={`${ui.btn} ${ui.btnSmall}`} onClick={() => setPhoto(null)}>
                Remove
              </button>
            )}
            <p className={ui.muted}>Optional · JPG or PNG, up to {MAX_PHOTO_MB} MB</p>
          </div>
        </div>
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
