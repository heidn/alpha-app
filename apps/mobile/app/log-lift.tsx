import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useStore } from '../src/data/store'
import type { LiftSet } from '../src/data/types'
import { Button, Field, Layout, Stepper, Text } from '../src/ui'
import { Screen } from '../src/shell/Screen'
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

  const bump = (i: number, d: number) => setSets((prev) => prev.map((s, j) => (j === i ? { ...s, weight: Math.max(0, s.weight + d) } : s)))
  const save = () => {
    store.saveResult(workout.id, { kind: 'lift', sets, notes: notes.trim() || undefined, loggedAt: store.today })
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  return (
    <Screen header={{ nav: 'close', eyebrow: 'Lifting' }} footer={<Button label="Save" onPress={save} />}>
      <Layout className="-mt-4">
        <LiftTitle lift={lift} />
      </Layout>

      <Layout className="mt-7 border-t border-line">
        {sets.map((set, i) => (
          <Layout key={i} row center between className="py-2.5 border-b border-line">
            <Text className="w-16 font-mono text-[17px] text-muted">
              {lift.sets} × {set.reps}
            </Text>
            <Stepper
              variant="row"
              value={String(set.weight)}
              unit="lb"
              name={`set ${i + 1} weight by ${step} lb`}
              onDown={() => bump(i, -step)}
              onUp={() => bump(i, step)}
            />
          </Layout>
        ))}
      </Layout>

      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="How did it feel?" multiline className="mt-6" />
    </Screen>
  )
}
