import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { longDate } from '../../src/data/dates'
import { percentOf, projectedAtPercent } from '../../src/data/rules'
import { useStore } from '../../src/data/store'
import { color, font, gutter, type } from '../../src/theme'
import { Check, ChevronLeft } from '../../src/ui/icons'
import { useTopInset } from '../../src/ui/hooks'
import { IconButton, SectionHeading } from '../../src/ui/kit'
import { PercentTable } from '../../src/ui/PercentTable'

export default function PersonalRecordScreen() {
  const { movementId } = useLocalSearchParams<{ movementId: string }>()
  const store = useStore()
  const top = useTopInset()
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const { today } = store
  // Today's programmed percent for this lift, if it's on today's workout.
  const todayLift = store.workoutOn(today)?.lift
  const todayPct = todayLift?.movementId === movementId ? todayLift.percent : undefined
  const stats = store.liftStats(movementId, todayPct, today)
  const tm = stats.training
  const step = store.settings.plateIncrement
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'))

  return (
    <ScrollView scrollEnabled={scrollEnabled} style={{ backgroundColor: color.bg }} contentContainerStyle={[styles.page, { paddingTop: top + 20 }]}>
      <IconButton label="Back" onPress={back} style={{ marginLeft: -12 }}>
        <ChevronLeft size={20} />
      </IconButton>

      <View style={{ marginTop: 12, gap: 6 }}>
        <SectionHeading>Personal record</SectionHeading>
        <Text style={type.title} accessibilityRole="header">
          {store.movementName(movementId)}
        </Text>
      </View>

      <View style={styles.cards}>
        <View style={[styles.card, styles.cardActual]}>
          <View style={styles.cardLabel}>
            <Check size={12} width={3} />
            <Text style={[type.monoLabel, { color: color.text }]}>Actual</Text>
          </View>
          <Text style={styles.cardValue}>
            {stats.actual?.weight ?? '—'} <Text style={styles.cardUnit}>lb</Text>
          </Text>
          <Text style={styles.cardSub}>{stats.actual ? `Lifted ${longDate(stats.actual.date)}` : 'No max yet'}</Text>
        </View>
        <View style={[styles.card, styles.cardProjected]}>
          <View style={styles.cardLabel}>
            <Text style={[styles.cardSub, { fontSize: 13, color: color.text2 }]}>≈</Text>
            <Text style={[type.monoLabel, { color: color.text2 }]}>Projected</Text>
          </View>
          <Text style={[styles.cardValue, { fontFamily: font.mono, color: color.text2 }]}>
            {stats.projected ?? '—'} <Text style={styles.cardUnit}>lb</Text>
          </Text>
          <Text style={styles.cardSub}>{stats.projected ? 'From recent sets' : 'Log sets to estimate'}</Text>
        </View>
      </View>

      <SectionHeading style={{ marginTop: 32 }}>Percentages</SectionHeading>

      {tm ? (
        <PercentTable
          todayPct={todayPct}
          weightAt={(pct) => percentOf(tm.weight, pct, step)}
          projectedAt={(pct) => projectedAtPercent(stats.projected ?? tm.weight, pct, step)}
          lastAt={stats.lastAt}
          onDragChange={(d) => setScrollEnabled(!d)}
        />
      ) : (
        <Text style={[type.body, { color: color.muted, marginTop: 14 }]}>Log a few sets to see your percentages.</Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: gutter, paddingBottom: 40 },
  cards: { marginTop: 24, flexDirection: 'row', gap: 10 },
  card: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, gap: 10 },
  cardActual: { borderColor: color.white },
  cardProjected: { borderColor: color.dashed, borderStyle: 'dashed' },
  cardLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardValue: { fontFamily: font.monoMedium, fontSize: 38, lineHeight: 42, color: color.text },
  cardUnit: { fontFamily: font.mono, fontSize: 13, color: color.muted },
  cardSub: { fontFamily: font.mono, fontSize: 11, color: color.muted },
})
