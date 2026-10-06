import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useStoreUser } from './useStoreUser.ts'

export function CurrentUser() {
  useStoreUser()
  const user = useQuery(api.users.current)
  if (!user) return <p>Loading…</p>
  return <p>Signed in as {user.name}</p>
}
