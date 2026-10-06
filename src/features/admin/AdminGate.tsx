import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { AdminPage } from './AdminPage.tsx'

// UI gate only; convex/admin.ts enforces the role server-side.
export function AdminGate() {
  const user = useQuery(api.users.current)
  if (user?.role !== 'admin') return null
  return <AdminPage />
}
