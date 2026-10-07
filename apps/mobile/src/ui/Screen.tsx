import { router, type Href } from 'expo-router'
import type { ReactNode, RefObject } from 'react'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color } from '../tokens'
import { Button } from './Button'
import { cx } from './cx'
import { ChevronLeft, Close } from './icons'
import { Layout } from './Layout'
import { Text } from './Text'

type Header = {
  /** Top-left control. back = chevron, close = ✕ (sheets/modals). */
  nav?: 'back' | 'close'
  /** Where nav goes when there's no history (deep link). Default: Today. */
  fallback?: Href
  right?: ReactNode
  eyebrow?: string
  title?: string
  /** Shown at the right of the title row (e.g. attended class time). */
  titleRight?: ReactNode
}

type Props = {
  header?: Header
  /** Pinned under the scroll area, above the home indicator (e.g. Save). */
  footer?: ReactNode
  scrollRef?: RefObject<ScrollView | null>
  /** Side gutters on the scroll content (default true). Off for full-bleed layouts like Today. */
  gutter?: boolean
  className?: string
  children: ReactNode
}

/** Page shell: safe area, optional header, scrolling content, optional pinned footer. */
export function Screen({ header, footer, scrollRef, gutter = true, className, children }: Props) {
  const { top, bottom } = useSafeAreaInsets()
  const leave = () => (router.canGoBack() ? router.back() : router.replace(header?.fallback ?? '/'))
  const body = (
    // Gesture-handler ScrollView (so in-page drags like the PR table can block it); NativeWind doesn't
    // style it, so it takes plain styles and `className` goes on the inner wrapper.
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingTop: header ? top + 20 : top, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className={cx(gutter && 'px-5', className)}>
      {header && (
        <Layout className="mb-6">
          <Layout row center between>
            {header.nav ? (
              <Button variant="icon" onPress={leave} accessibilityLabel={header.nav === 'close' ? 'Close' : 'Back'} className="-ml-3">
                {header.nav === 'close' ? <Close size={20} /> : <ChevronLeft size={20} />}
              </Button>
            ) : (
              <View />
            )}
            {header.right}
          </Layout>
          {(header.eyebrow || header.title) && (
            <Layout row between className="mt-3 items-end">
              <Layout className="gap-1.5 shrink">
                {header.eyebrow && <Text variant="heading">{header.eyebrow}</Text>}
                {header.title && (
                  <Text variant="title" accessibilityRole="header">
                    {header.title}
                  </Text>
                )}
              </Layout>
              {header.titleRight}
            </Layout>
          )}
        </Layout>
      )}
      {children}
      </View>
    </ScrollView>
  )
  if (!footer) return body
  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
      <View className="px-5 pt-3 bg-bg" style={{ paddingBottom: Math.max(bottom, 16) + 12 }}>
        {footer}
      </View>
    </KeyboardAvoidingView>
  )
}
