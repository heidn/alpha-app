import { SignInButton, UserButton } from '@clerk/clerk-react'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { CurrentUser } from './features/auth/CurrentUser.tsx'
import { SignOutButton } from './features/auth/SignOutButton.tsx'

export default function App() {
  return (
    <main>
      <h1>Alpha Strength</h1>
      <AuthLoading>
        <p>Loading…</p>
      </AuthLoading>
      <Unauthenticated>
        <SignInButton mode="modal" />
      </Unauthenticated>
      <Authenticated>
        <UserButton />
        <SignOutButton />
        <CurrentUser />
      </Authenticated>
    </main>
  )
}
