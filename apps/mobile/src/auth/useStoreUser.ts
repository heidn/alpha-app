import { useUser } from '@clerk/expo'
import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect } from 'react'
import { api } from '../../../../convex/_generated/api'

// Same as the web app: create/refresh the Convex `users` row after sign-in, incl. the Clerk photo.
export function useStoreUser() {
  const { isAuthenticated } = useConvexAuth()
  const { user } = useUser()
  const store = useMutation(api.users.store)
  const imageUrl = user ? (user.hasImage ? user.imageUrl : null) : undefined
  useEffect(() => {
    if (isAuthenticated) void store({ imageUrl })
  }, [isAuthenticated, store, user?.id, imageUrl])
}
