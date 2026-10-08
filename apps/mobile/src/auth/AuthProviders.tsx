import { ClerkProvider, useAuth } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { ReactNode } from 'react'
import { Platform } from 'react-native'
import { Layout, Text } from '../ui'
import { clerkPublishableKey, convexUrl } from './config'

const convex = convexUrl ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false }) : null

/** ClerkProvider → ConvexProviderWithClerk, same order as the web app. */
export function AuthProviders({ children }: { children: ReactNode }) {
  if (!clerkPublishableKey || !convex) return <MissingConfig />
  return (
    // SecureStore (encrypted) on device; Clerk's own browser storage on web.
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={Platform.OS === 'web' ? undefined : tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

function MissingConfig() {
  return (
    <Layout className="flex-1 bg-bg justify-center p-5 gap-3">
      <Text variant="title">Setup needed</Text>
      <Text className="text-[16px] leading-[22px] text-muted">
        Missing Clerk or Convex keys. Add VITE_CLERK_PUBLISHABLE_KEY and VITE_CONVEX_URL to the repo-root .env.local (or
        EXPO_PUBLIC_* equivalents), then restart Expo.
      </Text>
    </Layout>
  )
}
