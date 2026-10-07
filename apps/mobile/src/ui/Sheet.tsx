import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color, gutter } from '../theme'
import { Close } from './icons'
import { IconButton, PrimaryButton } from './kit'

/** Log screen frame: ✕, scrolling body, Save pinned to the bottom. */
export function Sheet({ children, onSave }: { children: ReactNode; onSave: () => void }) {
  const { bottom } = useSafeAreaInsets()
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'))
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <IconButton label="Close" onPress={close} style={{ marginLeft: -12 }}>
          <Close size={20} />
        </IconButton>
        {children}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(bottom, 16) + 12 }]}>
        <PrimaryButton
          label="Save"
          onPress={() => {
            onSave()
            close()
          }}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: gutter, paddingTop: 20, paddingBottom: 24 },
  footer: { paddingHorizontal: gutter, paddingTop: 12, backgroundColor: color.bg },
})
