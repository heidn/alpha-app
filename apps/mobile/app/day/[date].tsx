import { router, useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { clockLabel, dayTitle } from '../../src/data/dates'
import { divisionText, scoreText, topSet } from '../../src/data/rules'
import { useStore } from '../../src/data/store'
import { color, font, gutter, type } from '../../src/theme'
import { Check, ChevronLeft, Pencil } from '../../src/ui/icons'
import { useTopInset } from '../../src/ui/hooks'
import { AddButton, IconButton, PressableRow, SectionHeading } from '../../src/ui/kit'
import { LiftTitle, MetconHeader, MetconItems, WarmupSection } from '../../src/ui/workout'
import { workoutStyles as ws } from '../../src/ui/styles'

export default function PastDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>()
  const store = useStore()
  const top = useTopInset()
  const workout = store.workoutOn(date)
  const booking = store.bookingOn(date)
  const attendedClass = booking?.status === 'signedIn' ? store.classesOn(date).find((c) => c.id === booking.classSessionId) : undefined
  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/calendar', params: { date } }))

  const liftRes = workout && store.liftResult(workout.id)
  const metRes = workout && store.metconResult(workout.id)
  const heaviest = liftRes ? topSet(liftRes) : undefined
  const editLift = () => workout && router.push({ pathname: '/log-lift', params: { workoutId: workout.id } })
  const editMetcon = () => workout && router.push({ pathname: '/log-metcon', params: { workoutId: workout.id } })

  return (
    <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ paddingTop: top, paddingBottom: 40 }}>
      <View style={styles.header}>
        <IconButton label="Back to calendar" onPress={back} style={{ marginLeft: -12 }}>
          <ChevronLeft size={20} />
        </IconButton>
        <View style={styles.titleRow}>
          <Text style={type.title} accessibilityRole="header">
            {dayTitle(date)}
          </Text>
          {attendedClass && (
            <View style={styles.attended} accessibilityLabel={`Attended ${clockLabel(attendedClass.startsAt)} class`}>
              <Check size={14} stroke={color.muted} width={2.4} />
              <Text style={styles.attendedText}>{clockLabel(attendedClass.startsAt)}</Text>
            </View>
          )}
        </View>
      </View>

      {!workout ? (
        <Text style={[type.body, { color: color.muted, padding: gutter }]}>No workout this day.</Text>
      ) : (
        <View style={{ paddingHorizontal: gutter }}>
          {workout.warmup.length > 0 && <WarmupSection items={workout.warmup} dim />}

          {workout.lift && (
            <View style={[ws.section, { gap: 18 }]}>
              <SectionHeading>Lifting</SectionHeading>
              <View style={styles.liftRow}>
                <LiftTitle lift={workout.lift} />
                {liftRes && (
                  <IconButton label="Edit lift result" onPress={editLift} style={{ marginRight: -10 }}>
                    <Pencil stroke={color.muted} width={1.8} />
                  </IconButton>
                )}
              </View>
              {liftRes ? (
                <>
                  <View style={ws.topLine}>
                    {liftRes.sets.map((set, i) => (
                      <View key={i} style={styles.setRow}>
                        <Text style={styles.setLabel}>
                          {workout.lift!.sets} × {set.reps}
                        </Text>
                        <Text style={[styles.setWeight, set === heaviest && { color: color.accent }]}>
                          {set.weight} <Text style={styles.unit}>lb</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                  {liftRes.notes && <Text style={styles.note}>“{liftRes.notes}”</Text>}
                </>
              ) : (
                <AddButton label="Add lift result" onPress={editLift} />
              )}
            </View>
          )}

          {workout.metcon && (
            <View style={[ws.section, { gap: 18, borderBottomWidth: 0 }]}>
              <MetconHeader metcon={workout.metcon} />
              <MetconItems metcon={workout.metcon} dim />
              {metRes ? (
                <PressableRow accessibilityRole="button" accessibilityLabel="Edit metcon result" onPress={editMetcon} style={styles.score}>
                  <View style={styles.scoreLeft}>
                    <Text style={styles.scoreValue}>{scoreText(metRes.score)}</Text>
                    <Text style={styles.scoreDiv}>{divisionText(metRes.division)}</Text>
                  </View>
                  <Pencil stroke={color.bg} width={1.8} />
                </PressableRow>
              ) : (
                <AddButton label="Add metcon result" onPress={editMetcon} />
              )}
              {metRes?.notes && <Text style={styles.note}>“{metRes.notes}”</Text>}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: gutter, paddingTop: 20, paddingBottom: 20, gap: 14, borderBottomWidth: 1, borderBottomColor: color.line },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  attended: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attendedText: { fontFamily: font.mono, fontSize: 12, letterSpacing: 1, color: color.muted },
  liftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 },
  setRow: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  setLabel: { fontFamily: font.mono, fontSize: 14, color: color.muted },
  setWeight: { fontFamily: font.mono, fontSize: 20, color: color.text },
  unit: { fontSize: 12, color: color.muted },
  note: { fontFamily: font.sans, fontSize: 15, fontStyle: 'italic', color: color.text2 },
  score: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: color.white,
  },
  scoreLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  scoreValue: { fontFamily: font.monoMedium, fontSize: 34, lineHeight: 38, color: color.bg },
  scoreDiv: { fontFamily: font.sansSemi, fontSize: 13, letterSpacing: 1.56, textTransform: 'uppercase', color: color.bg },
})
