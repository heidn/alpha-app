import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useStore } from '../src/data/store'
import type { LiftSet } from '../src/data/types'
import { color, font } from '../src/theme'
import { NotesField, SectionHeading, StepButton } from '../src/ui/kit'
import { Sheet } from '../src/ui/Sheet'
import { LiftTitle } from '../src/ui/workout'

const EMPTY_BAR = 45

export default function LogLiftScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>()
  const store = useStore()
  const workout = store.workoutById(workoutId)
  const lift = workout?.lift
  const existing = workout && store.liftResult(workout.id)
  const step = store.settings.plateIncrement

  const [sets, setSets] = useState<LiftSet[]>(() => {
    if (existing) return existing.sets
    if (!lift || !workout) return []
    const w = store.liftStats(lift.movementId, lift.percent, workout.date).prescribed ?? EMPTY_BAR
    return Array.from({ length: lift.sets }, () => ({ reps: lift.reps, weight: w }))
  })
  const [notes, setNotes] = useState(existing?.notes ?? '')

  if (!workout || !lift) return null

  const bump = (i: number, d: number) =>
    setSets((prev) => prev.map((s, j) => (j === i ? { ...s, weight: Math.max(0, s.weight + d) } : s)))

  return (
    <Sheet
      onSave={() =>
        store.saveResult(workout.id, { kind: 'lift', sets, notes: notes.trim() || undefined, loggedAt: store.today })
      }
    >
      <View style={{ gap: 6, marginTop: 12 }}>
        <SectionHeading>Lifting</SectionHeading>
        <LiftTitle lift={lift} />
      </View>

      <View style={styles.sets}>
        {sets.map((set, i) => (
          <View key={i} style={styles.setRow}>
            <Text style={styles.setLabel}>
              {lift.sets} × {set.reps}
            </Text>
            <View style={styles.stepper}>
              <StepButton dir="down" label={`Decrease set ${i + 1} weight ${step} lb`} onPress={() => bump(i, -step)} />
              <View style={styles.weight} accessibilityLabel={`Set ${i + 1}: ${set.weight} pounds`}>
                <Text style={styles.weightValue}>{set.weight}</Text>
                <Text style={styles.unit}>lb</Text>
              </View>
              <StepButton dir="up" label={`Increase set ${i + 1} weight ${step} lb`} onPress={() => bump(i, step)} />
            </View>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 24 }}>
        <NotesField value={notes} onChange={setNotes} />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  sets: { marginTop: 28, borderTopWidth: 1, borderTopColor: color.line },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  setLabel: { width: 64, fontFamily: font.mono, fontSize: 17, color: color.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  weight: { width: 92, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 },
  weightValue: { fontFamily: font.monoMedium, fontSize: 30, lineHeight: 34, color: color.text },
  unit: { fontFamily: font.mono, fontSize: 12, color: color.muted },
})
