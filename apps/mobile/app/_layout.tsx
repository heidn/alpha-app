import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono'
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk'
import { useFonts } from 'expo-font'
import type { ComponentProps } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
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
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="log-lift" options={sheet} />
          <Stack.Screen name="log-metcon" options={sheet} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  )
}
