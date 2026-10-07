import { router } from 'expo-router'
import { Pressable, useWindowDimensions } from 'react-native'
import { clockLabel } from '../src/data/dates'
import { divisionText, scoreText, topSet } from '../src/data/rules'
import { useStore } from '../src/data/store'
import { color } from '../src/tokens'
import { ArrowRight, Button, CalendarIcon, Check, Layout, MenuIcon, Plus, Screen, Section, Text } from '../src/ui'
import { LiftTitle, MetconHeader, MetconItems, WarmupSection } from '../src/ui/workout'

export default function TodayScreen() {
  const store = useStore()
  const { width } = useWindowDimensions()
  // Radwave is wide: size the logo to ~2/3 of the screen instead of a fixed 64pt.
  const logoSize = Math.round(Math.min(width, 500) * 0.15)
  const { today } = store
  const workout = store.workoutOn(today)
  const booking = store.bookingOn(today)
  const bookedClass = booking && store.classesOn(today).find((c) => c.id === booking.classSessionId)
  const lift = workout?.lift
  const stats = lift ? store.liftStats(lift.movementId, lift.percent, today) : undefined
  const liftResult = workout && store.liftResult(workout.id)
  const metconResult = workout && store.metconResult(workout.id)
  const logLift = () => workout && router.push({ pathname: '/log-lift', params: { workoutId: workout.id } })
  const logMetcon = () => workout && router.push({ pathname: '/log-metcon', params: { workoutId: workout.id } })

  return (
    <Screen gutter={false}>
      <Layout row between className="items-end pt-[30px] pb-5 pr-5 border-b border-line">
        <Text variant="logo" accessibilityRole="header" className="-ml-1.5" style={{ fontSize: logoSize, lineHeight: logoSize }}>
          alpha
        </Text>
        <Button variant="icon" onPress={() => router.push('/menu')} accessibilityLabel="Menu" className="absolute top-0 right-[9px]">
          <MenuIcon />
        </Button>
        <Button variant="icon" onPress={() => router.push('/calendar')} accessibilityLabel="Open calendar" className="-mr-3 h-8 justify-end pb-[3px]">
          <CalendarIcon />
        </Button>
      </Layout>

      <Layout className="px-5">
        <Layout className="pt-[22px] pb-4 border-b border-line">
          {!booking ? (
            <Button variant="hero" label="book a class" onPress={() => router.push('/calendar')} />
          ) : booking.status === 'signedIn' ? (
            <Button
              variant="hero"
              accessibilityLabel="Signed in. Tap to undo."
              feedback="light"
              onPress={() => store.setSignedIn(today, false)}
              className="bg-transparent border-[1.5px] border-white"
            >
              <Check size={20} width={2.4} />
              <Text className="font-radwave text-[24px] tracking-[0.5px]">signed in</Text>
            </Button>
          ) : (
            <Button
              variant="hero"
              label="sign in"
              accessibilityLabel={bookedClass ? `sign in, ${clockLabel(bookedClass.startsAt)} class` : 'sign in'}
              onPress={() => store.setSignedIn(today, true)}
            >
              {bookedClass && <Text className="font-mono text-[13px] tracking-[1px] text-muted-ink">{clockLabel(bookedClass.startsAt)}</Text>}
            </Button>
          )}
          <Button variant="ghost" label="Leaderboard" onPress={() => router.push('/leaderboard')} className="mt-3 self-center">
            <ArrowRight size={14} />
          </Button>
        </Layout>

        {!workout ? (
          <Section>
            <Text className="text-muted">Workout not posted yet.</Text>
          </Section>
        ) : (
          <>
            {workout.warmup.length > 0 && <WarmupSection items={workout.warmup} collapsible />}

            {lift && (
              <Section heading="Lifting">
                <Layout row between className="items-end gap-4">
                  <LiftTitle lift={lift} />
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`${store.movementName(lift.movementId)} personal record and percentages`}
                    onPress={() => router.push(`/record/${lift.movementId}`)}
                    className="items-end justify-end gap-1 pt-1.5 pb-1 pl-3 min-h-11 active:opacity-60"
                  >
                    {stats?.prescribed !== undefined ? (
                      <>
                        <Text className="font-mono-medium text-[30px] leading-[32px]">{stats.prescribed}</Text>
                        <Layout row center className="gap-1.5">
                          <Text variant="label">
                            {stats.training?.source === 'actual' ? 'Actual' : 'Projected'} {lift.percent}%
                          </Text>
                          <ArrowRight size={12} width={2.4} />
                        </Layout>
                      </>
                    ) : (
                      <Text variant="label">Set your max</Text>
                    )}
                  </Pressable>
                </Layout>
                {liftResult ? (
                  <Button variant="chip" label={`${topSet(liftResult).weight} × ${topSet(liftResult).reps}`} accessibilityLabel="Edit lift result" onPress={logLift}>
                    <Check size={16} stroke={color.ink} width={2.4} />
                  </Button>
                ) : (
                  <Button variant="round" accessibilityLabel={`Add ${store.movementName(lift.movementId).toLowerCase()} result`} onPress={logLift}>
                    <Plus stroke={color.ink} />
                  </Button>
                )}
              </Section>
            )}

            {workout.metcon && (
              <Section divider={false}>
                <MetconHeader metcon={workout.metcon} />
                <MetconItems metcon={workout.metcon} />
                {metconResult ? (
                  <Button
                    variant="chip"
                    label={`${scoreText(metconResult.score)} · ${divisionText(metconResult.division)}`}
                    accessibilityLabel="Edit metcon result"
                    onPress={logMetcon}
                  >
                    <Check size={16} stroke={color.ink} width={2.4} />
                  </Button>
                ) : (
                  <Button variant="round" accessibilityLabel="Add metcon result" onPress={logMetcon}>
                    <Plus stroke={color.ink} />
                  </Button>
                )}
              </Section>
            )}
          </>
        )}
      </Layout>
    </Screen>
  )
}
