import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { LoginPage } from './features/auth/LoginPage.tsx'
import { AppShell } from './features/shell/AppShell.tsx'

export default function App() {
  return (
    <>
      <AuthLoading>
        <p className="visually-hidden">Loading…</p>
      </AuthLoading>
      <Unauthenticated>
        <LoginPage />
      </Unauthenticated>
      <Authenticated>
        <AppShell />
      </Authenticated>
    </>
  )
}
