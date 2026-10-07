import { ClerkProvider, useAuth } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { ReactNode } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { color, font, gutter, type } from '../theme'
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
    <View style={styles.root}>
      <Text style={type.title}>Setup needed</Text>
      <Text style={styles.body}>
        Missing Clerk or Convex keys. Add VITE_CLERK_PUBLISHABLE_KEY and VITE_CONVEX_URL to the repo-root .env.local (or
        EXPO_PUBLIC_* equivalents), then restart Expo.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, justifyContent: 'center', padding: gutter, gap: 12 },
  body: { fontFamily: font.sans, fontSize: 16, lineHeight: 22, color: color.muted },
})
