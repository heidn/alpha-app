import { useEffect } from 'react'
import { useUser } from '@clerk/react'
import { useConvexAuth, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function useStoreUser() {
  const { isAuthenticated } = useConvexAuth()
  const { user } = useUser()
  const store = useMutation(api.users.store)
  useEffect(() => {
    if (isAuthenticated) void store()
  }, [isAuthenticated, store, user?.id])
}
