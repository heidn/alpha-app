import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { clockLabel } from '../src/data/dates'
import { divisionText, scoreText, topSet } from '../src/data/rules'
import { useStore } from '../src/data/store'
import { color, font, gutter, type } from '../src/theme'
import { ArrowRight, CalendarIcon, Check, MenuIcon } from '../src/ui/icons'
import { haptic, useTopInset } from '../src/ui/hooks'
import { AddButton, IconButton, SectionHeading } from '../src/ui/kit'
import { LiftTitle, MetconHeader, MetconItems, WarmupSection } from '../src/ui/workout'
import { workoutStyles as ws } from '../src/ui/styles'

export default function TodayScreen() {
  const store = useStore()
  const top = useTopInset()
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

  return (
    <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ paddingTop: top, paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={[styles.logo, { fontSize: logoSize, lineHeight: logoSize }]} accessibilityRole="header">
          alpha
        </Text>
        <IconButton label="Menu" onPress={() => router.push('/menu')} style={styles.menu}>
          <MenuIcon />
        </IconButton>
        <IconButton label="Open calendar" onPress={() => router.push('/calendar')} style={styles.calendar}>
          <CalendarIcon />
        </IconButton>
      </View>

      <View style={{ paddingHorizontal: gutter }}>
        <View style={styles.signInBlock}>
          {!booking ? (
            <SignInPill label="book a class" onPress={() => router.push('/calendar')} />
          ) : booking.status === 'signedIn' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Signed in. Tap to undo."
              onPress={() => store.setSignedIn(today, false)}
              style={[styles.pill, styles.pillOutlined]}
            >
              <Check size={20} width={2.4} />
              <Text style={[styles.pillText, { color: color.text }]}>signed in</Text>
            </Pressable>
          ) : (
            <SignInPill
              label="sign in"
              time={bookedClass ? clockLabel(bookedClass.startsAt) : undefined}
              onPress={() => store.setSignedIn(today, true)}
            />
          )}
          <Pressable accessibilityRole="link" onPress={() => router.push('/leaderboard')} style={styles.leaderboard}>
            <Text style={styles.leaderboardText}>Leaderboard</Text>
            <ArrowRight size={14} />
          </Pressable>
        </View>

        {!workout ? (
          <View style={ws.section}>
            <Text style={[type.body, { color: color.muted }]}>Workout not posted yet.</Text>
          </View>
        ) : (
          <>
            {workout.warmup.length > 0 && <WarmupSection items={workout.warmup} collapsible />}

            {lift && (
              <View style={[ws.section, { gap: 18 }]}>
                <SectionHeading>Lifting</SectionHeading>
                <View style={styles.liftRow}>
                  <LiftTitle lift={lift} />
                  {stats?.prescribed !== undefined ? (
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`${store.movementName(lift.movementId)} personal record and percentages`}
                      onPress={() => router.push(`/record/${lift.movementId}`)}
                      style={styles.prescribed}
                    >
                      <Text style={styles.prescribedWeight}>{stats.prescribed}</Text>
                      <View style={styles.prescribedLabel}>
                        <Text style={type.monoLabel}>
                          {stats.training?.source === 'actual' ? 'Actual' : 'Projected'} {lift.percent}%
                        </Text>
                        <ArrowRight size={12} width={2.4} />
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => router.push(`/record/${lift.movementId}`)}
                      style={styles.prescribed}
                    >
                      <Text style={type.monoLabel}>Set your max</Text>
                    </Pressable>
                  )}
                </View>
                {liftResult ? (
                  <ResultChip
                    label={`${topSet(liftResult).weight} × ${topSet(liftResult).reps}`}
                    a11y="Edit lift result"
                    onPress={() => router.push({ pathname: '/log-lift', params: { workoutId: workout.id } })}
                  />
                ) : (
                  <AddButton
                    label={`Add ${store.movementName(lift.movementId).toLowerCase()} result`}
                    onPress={() => router.push({ pathname: '/log-lift', params: { workoutId: workout.id } })}
                  />
                )}
              </View>
            )}

            {workout.metcon && (
              <View style={[ws.section, { gap: 18, borderBottomWidth: 0 }]}>
                <MetconHeader metcon={workout.metcon} />
                <MetconItems metcon={workout.metcon} />
                {metconResult ? (
                  <ResultChip
                    label={`${scoreText(metconResult.score)} · ${divisionText(metconResult.division)}`}
                    a11y="Edit metcon result"
                    onPress={() => router.push({ pathname: '/log-metcon', params: { workoutId: workout.id } })}
                  />
                ) : (
                  <AddButton
                    label="Add metcon result"
                    onPress={() => router.push({ pathname: '/log-metcon', params: { workoutId: workout.id } })}
                  />
                )}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  )
}

function SignInPill({ label, time, onPress }: { label: string; time?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={time ? `${label}, ${time} class` : label}
      onPressIn={() => haptic('medium')}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, styles.pillFilled, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <Text style={styles.pillText}>{label}</Text>
      {time && <Text style={styles.pillTime}>{time}</Text>}
    </Pressable>
  )
}

/** Logged result replaces the + button; tap to edit. */
function ResultChip({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${a11y}`}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.chipText}>{label}</Text>
      <Check size={16} stroke={color.bg} width={2.4} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 30,
    paddingBottom: 20,
    paddingRight: gutter,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  logo: {
    marginLeft: -6,
    fontFamily: font.radwave,
    includeFontPadding: false,
    color: color.text,
  },
  menu: { position: 'absolute', top: 0, right: 9 },
  calendar: { marginRight: -12, height: 32, justifyContent: 'flex-end', paddingBottom: 3 },
  signInBlock: { paddingTop: 22, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: color.line },
  pill: {
    height: 76,
    borderRadius: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  pillFilled: { backgroundColor: color.white },
  pillOutlined: { borderWidth: 1.5, borderColor: color.white },
  pillText: { fontFamily: font.radwave, fontSize: 24, lineHeight: 30, letterSpacing: 0.5, color: color.bg },
  pillTime: { fontFamily: font.mono, fontSize: 13, letterSpacing: 1, color: color.mutedOnWhite },
  leaderboard: {
    marginTop: 12,
    alignSelf: 'center',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leaderboardText: { fontFamily: font.sansMedium, fontSize: 15, letterSpacing: 0.3, color: color.text },
  liftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 },
  prescribed: { alignItems: 'flex-end', gap: 4, paddingTop: 6, paddingBottom: 4, paddingLeft: 12, minHeight: 44, justifyContent: 'flex-end' },
  prescribedWeight: { fontFamily: font.monoMedium, fontSize: 30, lineHeight: 32, color: color.text },
  prescribedLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: {
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: color.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chipText: { fontFamily: font.monoMedium, fontSize: 16, color: color.bg },
})
