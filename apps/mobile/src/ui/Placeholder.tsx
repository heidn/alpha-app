import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { color, gutter, type } from '../theme'
import { ChevronLeft } from './icons'
import { useTopInset } from './hooks'
import { IconButton, SectionHeading } from './kit'

/** Simple page frame for screens the handoff hasn't designed yet. */
export function PlainPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  const top = useTopInset()
  return (
    <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ paddingTop: top + 20, paddingHorizontal: gutter, paddingBottom: 40 }}>
      <IconButton label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ marginLeft: -12 }}>
        <ChevronLeft size={20} />
      </IconButton>
      <View style={{ marginTop: 12, gap: 6, marginBottom: 24 }}>
        <SectionHeading>{eyebrow}</SectionHeading>
        <Text style={type.title} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </ScrollView>
  )
}
