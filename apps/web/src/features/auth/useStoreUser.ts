import { useEffect } from 'react'
import { useUser } from '@clerk/react'
import { useConvexAuth, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'

// Re-runs when the Clerk photo changes (onboarding upload or Clerk's account screen).
export function useStoreUser() {
  const { isAuthenticated } = useConvexAuth()
  const { user } = useUser()
  const store = useMutation(api.users.store)
  const imageUrl = user ? (user.hasImage ? user.imageUrl : null) : undefined
  useEffect(() => {
    if (isAuthenticated) void store({ imageUrl })
  }, [isAuthenticated, store, user?.id, imageUrl])
}
