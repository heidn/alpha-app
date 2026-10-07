import { router, useLocalSearchParams } from 'expo-router'
import { clockLabel, dayTitle } from '../../src/data/dates'
import { divisionText, scoreText, topSet } from '../../src/data/rules'
import { useStore } from '../../src/data/store'
import { color } from '../../src/tokens'
import { Button, Card, Check, cx, Layout, Pencil, Plus, Screen, Section, Text } from '../../src/ui'
import { LiftTitle, MetconHeader, MetconItems, WarmupSection } from '../../src/ui/workout'

export default function PastDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>()
  const store = useStore()
  const workout = store.workoutOn(date)
  const booking = store.bookingOn(date)
  const attendedClass = booking?.status === 'signedIn' ? store.classesOn(date).find((c) => c.id === booking.classSessionId) : undefined
  const liftRes = workout && store.liftResult(workout.id)
  const metRes = workout && store.metconResult(workout.id)
  const heaviest = liftRes ? topSet(liftRes) : undefined
  const editLift = () => workout && router.push({ pathname: '/log-lift', params: { workoutId: workout.id } })
  const editMetcon = () => workout && router.push({ pathname: '/log-metcon', params: { workoutId: workout.id } })

  return (
    <Screen
      header={{
        nav: 'back',
        fallback: { pathname: '/calendar', params: { date } },
        title: dayTitle(date),
        titleRight: attendedClass && (
          <Layout row center className="gap-1.5" accessibilityLabel={`Attended ${clockLabel(attendedClass.startsAt)} class`}>
            <Check size={14} stroke={color.muted} width={2.4} />
            <Text className="font-mono text-[12px] tracking-[1px] text-muted">{clockLabel(attendedClass.startsAt)}</Text>
          </Layout>
        ),
      }}
    >
      <Layout className="-mx-5 px-5 border-t border-line">
      {!workout ? (
        <Text className="text-muted py-5">No workout this day.</Text>
      ) : (
        <>
          {workout.warmup.length > 0 && <WarmupSection items={workout.warmup} dim />}

          {workout.lift && (
            <Section heading="Lifting">
              <Layout row between className="items-end gap-4">
                <LiftTitle lift={workout.lift} />
                {liftRes && (
                  <Button variant="icon" accessibilityLabel="Edit lift result" onPress={editLift} className="-mr-2.5">
                    <Pencil stroke={color.muted} width={1.8} />
                  </Button>
                )}
              </Layout>
              {liftRes ? (
                <>
                  <Layout className="border-t border-line">
                    {liftRes.sets.map((set, i) => (
                      <Layout key={i} row center between className="h-12 border-b border-line">
                        <Text className="font-mono text-[14px] text-muted">
                          {workout.lift?.sets} × {set.reps}
                        </Text>
                        <Text className={cx('font-mono text-[20px]', set === heaviest && 'text-accent')}>
                          {set.weight} <Text className="text-[12px] text-muted">lb</Text>
                        </Text>
                      </Layout>
                    ))}
                  </Layout>
                  {liftRes.notes && <Text className="text-[15px] italic text-fg-2">“{liftRes.notes}”</Text>}
                </>
              ) : (
                <Button variant="round" accessibilityLabel="Add lift result" onPress={editLift}>
                  <Plus stroke={color.ink} />
                </Button>
              )}
            </Section>
          )}

          {workout.metcon && (
            <Section divider={false}>
              <MetconHeader metcon={workout.metcon} />
              <MetconItems metcon={workout.metcon} dim />
              {metRes ? (
                <Card variant="white" onPress={editMetcon} accessibilityLabel="Edit metcon result" className="flex-row items-center justify-between py-[18px] px-5 rounded-[14px]">
                  <Layout row className="items-baseline gap-3">
                    <Text className="font-mono-medium text-[34px] leading-[38px] text-ink">{scoreText(metRes.score)}</Text>
                    <Text className="font-sans-semibold text-[13px] tracking-[1.6px] uppercase text-ink">{divisionText(metRes.division)}</Text>
                  </Layout>
                  <Pencil stroke={color.ink} width={1.8} />
                </Card>
              ) : (
                <Button variant="round" accessibilityLabel="Add metcon result" onPress={editMetcon}>
                  <Plus stroke={color.ink} />
                </Button>
              )}
              {metRes?.notes && <Text className="text-[15px] italic text-fg-2">“{metRes.notes}”</Text>}
            </Section>
          )}
        </>
      )}
      </Layout>
    </Screen>
  )
}
