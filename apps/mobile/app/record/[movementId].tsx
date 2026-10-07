import { router, useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { longDate } from '../../src/data/dates'
import { percentOf } from '../../src/data/rules'
import { useStore } from '../../src/data/store'
import { color, font, gutter, type } from '../../src/theme'
import { Check, ChevronLeft } from '../../src/ui/icons'
import { useTopInset } from '../../src/ui/hooks'
import { Grain, IconButton, SectionHeading } from '../../src/ui/kit'

const PERCENTS = Array.from({ length: 13 }, (_, i) => 100 - i * 5)

/** Grain density scales with percentage: 0.1 at 40%, 1 at 100%. */
const grainOpacity = (pct: number) => {
  const t = (pct - 40) / 60
  return 0.1 + 0.9 * t * t
}

export default function PersonalRecordScreen() {
  const { movementId } = useLocalSearchParams<{ movementId: string }>()
  const store = useStore()
  const top = useTopInset()
  const { today } = store
  // Today's programmed percent for this lift, if it's on today's workout.
  const todayLift = store.workoutOn(today)?.lift
  const todayPct = todayLift?.movementId === movementId ? todayLift.percent : undefined
  const stats = store.liftStats(movementId, todayPct, today)
  const tm = stats.training
  const step = store.settings.plateIncrement
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'))

  return (
    <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={[styles.page, { paddingTop: top + 20 }]}>
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
        <View style={styles.table}>
          {PERCENTS.map((pct) => {
            const weight = percentOf(tm.weight, pct, step)
            if (pct === todayPct) {
              return (
                <View key={pct} style={[styles.row, styles.rowToday]} accessibilityLabel={`Today, ${pct}%: ${weight} pounds`}>
                  <View style={styles.rowLeft}>
                    <Text style={[styles.pct, { color: color.bg }]}>{pct}%</Text>
                    <Text style={styles.todayTag}>Today</Text>
                  </View>
                  <View style={styles.todayValues}>
                    <View style={styles.todayCol}>
                      <View style={styles.todayLabelRow}>
                        {tm.source === 'actual' ? (
                          <Check size={10} width={3} stroke={color.mutedOnWhite} />
                        ) : (
                          <Text style={styles.todayLabel}>≈</Text>
                        )}
                        <Text style={styles.todayLabel}>{tm.source === 'actual' ? 'Actual' : 'Projected'}</Text>
                      </View>
                      <Text style={[styles.weight, { color: color.bg, fontFamily: font.mono }]}>
                        {weight} <Text style={[styles.unit, { color: color.mutedOnWhite }]}>lb</Text>
                      </Text>
                    </View>
                    {stats.lastAtPercent !== undefined && (
                      <>
                        <View style={styles.todayDivider} />
                        <View style={styles.todayCol}>
                          <View style={styles.todayLabelRow}>
                            <Check size={10} width={3} stroke={color.mutedOnWhite} />
                            <Text style={styles.todayLabel}>Last {pct}%</Text>
                          </View>
                          <Text style={[styles.weight, { color: color.bg }]}>
                            {stats.lastAtPercent} <Text style={[styles.unit, { color: color.mutedOnWhite }]}>lb</Text>
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              )
            }
            return (
              <View key={pct} style={styles.row} accessibilityLabel={`${pct}%: ${weight} pounds`}>
                <Grain opacity={grainOpacity(pct)} />
                <Text style={styles.pct}>{pct}%</Text>
                <Text style={styles.weight}>
                  {weight} <Text style={styles.unit}>lb</Text>
                </Text>
              </View>
            )
          })}
        </View>
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
  table: { marginTop: 14, gap: 4 },
  row: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: color.surface,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowToday: { height: 64, backgroundColor: color.white },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pct: { width: 44, fontFamily: font.mono, fontSize: 15, color: color.text },
  todayTag: { fontFamily: font.sansSemi, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: color.accentOnWhite },
  weight: { fontFamily: font.monoMedium, fontSize: 20, color: color.text },
  unit: { fontFamily: font.mono, fontSize: 12, color: color.muted },
  todayValues: { flexDirection: 'row', gap: 18 },
  todayCol: { alignItems: 'flex-end', gap: 3 },
  todayLabel: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: color.mutedOnWhite },
  todayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  todayDivider: { width: 1, backgroundColor: '#D4D4D8' },
})
