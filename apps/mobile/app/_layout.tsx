import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono'
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk'
import { useFonts } from 'expo-font'
import type { ComponentProps } from 'react'
import { useConvexAuth } from 'convex/react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProviders } from '../src/auth/AuthProviders'
import { useStoreUser } from '../src/auth/useStoreUser'
import { StoreProvider } from '../src/data/store'
import { color } from '../src/theme'

const sheet: ComponentProps<typeof Stack.Screen>['options'] = {
  presentation: 'formSheet',
  sheetAllowedDetents: [0.94],
  sheetGrabberVisible: true,
  sheetCornerRadius: 20,
  contentStyle: { backgroundColor: color.bg },
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Radwave: require('../assets/fonts/Radwave.otf'),
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  })
  if (!loaded) return <View style={{ flex: 1, backgroundColor: color.bg }} />

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProviders>
          <StoreProvider>
            <RootStack />
          </StoreProvider>
        </AuthProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

/** Signed-out users only reach sign-in; everything else needs a Convex-authenticated Clerk session. */
function RootStack() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  useStoreUser()
  if (isLoading) return <View style={{ flex: 1, backgroundColor: color.bg }} />
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="index" />
        <Stack.Screen name="log-lift" options={sheet} />
        <Stack.Screen name="log-metcon" options={sheet} />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="day/[date]" />
        <Stack.Screen name="record/[movementId]" />
        <Stack.Screen name="menu" />
        <Stack.Screen name="leaderboard" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  )
}
