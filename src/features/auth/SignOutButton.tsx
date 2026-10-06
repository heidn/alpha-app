import { useClerk } from '@clerk/clerk-react'

export function SignOutButton() {
  const { signOut } = useClerk()
  return (
    <button type="button" onClick={() => void signOut({ redirectUrl: '/' })}>
      Sign out
    </button>
  )
}
