import { useUser } from '@clerk/expo'
import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect } from 'react'
import { api } from '../../../../convex/_generated/api'

// Same as the web app: create/refresh the Convex `users` row after sign-in.
export function useStoreUser() {
  const { isAuthenticated } = useConvexAuth()
  const { user } = useUser()
  const store = useMutation(api.users.store)
  useEffect(() => {
    if (isAuthenticated) void store()
  }, [isAuthenticated, store, user?.id])
}
