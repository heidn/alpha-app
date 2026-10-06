import { SignInButton, UserButton } from '@clerk/clerk-react'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { AdminGate } from './features/admin/AdminGate.tsx'
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
        <UserButton showName />
        <SignOutButton />
        <CurrentUser />
        <AdminGate />
      </Authenticated>
    </main>
  )
}
