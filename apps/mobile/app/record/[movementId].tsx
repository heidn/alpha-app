import { useLocalSearchParams } from 'expo-router'
import { useRef } from 'react'
import type { ScrollView } from 'react-native-gesture-handler'
import { longDate } from '../../src/data/dates'
import { percentOf, projectedAtPercent } from '../../src/data/rules'
import { useStore } from '../../src/data/store'
import { Card, Check, Layout, Screen, Text } from '../../src/ui'
import { PercentTable } from '../../src/ui/PercentTable'

export default function PersonalRecordScreen() {
  const { movementId } = useLocalSearchParams<{ movementId: string }>()
  const store = useStore()
  const scrollRef = useRef<ScrollView>(null)
  const { today } = store
  // Today's programmed percent for this lift, if it's on today's workout.
  const todayLift = store.workoutOn(today)?.lift
  const todayPct = todayLift?.movementId === movementId ? todayLift.percent : undefined
  const stats = store.liftStats(movementId, todayPct, today)
  const tm = stats.training
  const step = store.settings.plateIncrement

  return (
    <Screen header={{ nav: 'back', eyebrow: 'Personal record', title: store.movementName(movementId) }} scrollRef={scrollRef}>
      <Layout row className="gap-2.5">
        <Card className="flex-1 gap-2.5 rounded-[14px] border-[1.5px] border-white">
          <Layout row center className="gap-1.5">
            <Check size={12} width={3} />
            <Text variant="label" className="text-fg">
              Actual
            </Text>
          </Layout>
          <Text className="font-mono-medium text-[38px] leading-[42px]">
            {stats.actual?.weight ?? '—'} <Text className="font-mono text-[13px] text-muted">lb</Text>
          </Text>
          <Text className="font-mono text-[11px] text-muted">{stats.actual ? `Lifted ${longDate(stats.actual.date)}` : 'No max yet'}</Text>
        </Card>
        <Card variant="dashed" className="flex-1 gap-2.5 rounded-[14px] border-[1.5px] border-dashed">
          <Layout row center className="gap-1.5">
            <Text className="font-mono text-[13px] text-fg-2">≈</Text>
            <Text variant="label" className="text-fg-2">
              Projected
            </Text>
          </Layout>
          <Text className="font-mono text-[38px] leading-[42px] text-fg-2">
            {stats.projected ?? '—'} <Text className="text-[13px] text-muted">lb</Text>
          </Text>
          <Text className="font-mono text-[11px] text-muted">{stats.projected ? 'From recent sets' : 'Log sets to estimate'}</Text>
        </Card>
      </Layout>

      <Text variant="heading" className="mt-8">
        Percentages
      </Text>
      {tm ? (
        <PercentTable
          todayPct={todayPct}
          weightAt={(pct) => percentOf(tm.weight, pct, step)}
          projectedAt={(pct) => projectedAtPercent(stats.projected ?? tm.weight, pct, step)}
          lastAt={stats.lastAt}
          scrollRef={scrollRef}
        />
      ) : (
        <Text className="mt-3.5 text-muted">Log a few sets to see your percentages.</Text>
      )}
    </Screen>
  )
}
