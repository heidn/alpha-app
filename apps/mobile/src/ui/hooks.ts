import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function haptic(kind: 'medium' | 'light' | 'success' = 'light') {
  if (Platform.OS === 'web') return
  if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  else void Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light)
}

/** Safe-area top; mockup offsets are measured below it. */
export function useTopInset() {
  return useSafeAreaInsets().top
}
