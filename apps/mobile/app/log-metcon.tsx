import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { METCON_LABEL, repsPerRound } from '../src/data/rules'
import { useStore } from '../src/data/store'
import type { Division, MetconPart, MetconScore } from '../src/data/types'
import { color, font, type } from '../src/theme'
import { NotesField, SectionHeading, Segmented, StepperCard } from '../src/ui/kit'
import { Sheet } from '../src/ui/Sheet'
import { MetconItems } from '../src/ui/workout'

const HINT: Record<MetconPart['type'], string> = {
  amrap: '[rounds + reps]',
  forTime: '[time]',
  emom: '[completed]',
  maxLoad: '[heaviest load]',
  other: '[completed]',
}

function initialScore(metcon: MetconPart): MetconScore {
  switch (metcon.type) {
    case 'amrap':
      return { kind: 'amrap', rounds: 0, reps: 0 }
    case 'forTime':
      return { kind: 'forTime', timeSec: metcon.timeCapSec ? Math.round(metcon.timeCapSec * 0.75) : 600 }
    case 'maxLoad':
      return { kind: 'maxLoad', load: 95 }
    default:
      return { kind: 'emom', done: true }
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export default function LogMetconScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>()
  const store = useStore()
  const workout = store.workoutById(workoutId)
  const metcon = workout?.metcon
  const existing = workout && store.metconResult(workout.id)

  const [score, setScore] = useState<MetconScore | undefined>(() => existing?.score ?? (metcon && initialScore(metcon)))
  const [division, setDivision] = useState<Division>(existing?.division ?? 'rx')
  const [notes, setNotes] = useState(existing?.notes ?? '')

  if (!workout || !metcon || !score) return null

  return (
    <Sheet
      onSave={() =>
        store.saveResult(workout.id, {
          kind: 'metcon',
          division,
          score,
          notes: notes.trim() || undefined,
          loggedAt: store.today,
        })
      }
    >
      <View style={{ gap: 6, marginTop: 12 }}>
        <SectionHeading>Metcon</SectionHeading>
        <Text style={type.title}>
          {METCON_LABEL[metcon.type]} <Text style={styles.hint}>{HINT[metcon.type]}</Text>
        </Text>
      </View>

      <View style={{ marginTop: 18 }}>
        <MetconItems metcon={metcon} compact />
      </View>

      <View style={{ marginTop: 24 }}>
        <ScoreInput metcon={metcon} score={score} onChange={setScore} />
      </View>

      <View style={{ marginTop: 20 }}>
        <Segmented
          label="Division"
          value={division}
          onChange={setDivision}
          options={[
            { value: 'rx', label: 'Rx' },
            { value: 'scaled', label: 'Scaled' },
          ]}
        />
      </View>

      <View style={{ marginTop: 20 }}>
        <NotesField value={notes} onChange={setNotes} />
      </View>
    </Sheet>
  )
}

/** Score input depends on metcon type (handoff §3). */
function ScoreInput({
  metcon,
  score,
  onChange,
}: {
  metcon: MetconPart
  score: MetconScore
  onChange: (s: MetconScore) => void
}) {
  switch (score.kind) {
    case 'amrap': {
      const maxReps = Math.max(0, repsPerRound(metcon) - 1)
      return (
        <View style={styles.pair}>
          <StepperCard
            label="Rounds"
            name="rounds"
            value={String(score.rounds)}
            onDown={() => onChange({ ...score, rounds: clamp(score.rounds - 1, 0, 99) })}
            onUp={() => onChange({ ...score, rounds: clamp(score.rounds + 1, 0, 99) })}
          />
          <StepperCard
            label="+ Reps"
            name="reps"
            value={String(score.reps)}
            onDown={() => onChange({ ...score, reps: clamp(score.reps - 1, 0, maxReps) })}
            onUp={() => onChange({ ...score, reps: clamp(score.reps + 1, 0, maxReps) })}
          />
        </View>
      )
    }
    case 'forTime': {
      const capped = score.cappedReps !== undefined
      const sec = score.timeSec ?? 0
      const cap = metcon.timeCapSec ?? 60 * 60
      const setSec = (v: number) => onChange({ kind: 'forTime', timeSec: clamp(v, 0, cap) })
      return (
        <View style={{ gap: 12 }}>
          <Segmented
            label="Finished or capped"
            value={capped ? 'cap' : 'done'}
            onChange={(v) =>
              onChange(v === 'cap' ? { kind: 'forTime', cappedReps: 0 } : { kind: 'forTime', timeSec: Math.round(cap * 0.75) })
            }
            options={[
              { value: 'done', label: 'Finished' },
              { value: 'cap', label: 'Hit the cap' },
            ]}
          />
          {capped ? (
            <View style={styles.pair}>
              <StepperCard
                label="Reps at cap"
                name="reps"
                value={String(score.cappedReps)}
                onDown={() => onChange({ kind: 'forTime', cappedReps: Math.max(0, (score.cappedReps ?? 0) - 1) })}
                onUp={() => onChange({ kind: 'forTime', cappedReps: (score.cappedReps ?? 0) + 1 })}
              />
            </View>
          ) : (
            <View style={styles.pair}>
              <StepperCard
                label="Min"
                name="minutes"
                value={String(Math.floor(sec / 60))}
                onDown={() => setSec(sec - 60)}
                onUp={() => setSec(sec + 60)}
              />
              <StepperCard
                label="Sec"
                name="seconds"
                value={String(sec % 60).padStart(2, '0')}
                onDown={() => setSec(sec - 5)}
                onUp={() => setSec(sec + 5)}
              />
            </View>
          )}
        </View>
      )
    }
    case 'maxLoad':
      return (
        <View style={styles.pair}>
          <StepperCard
            label="Load · lb"
            name="pounds"
            value={String(score.load)}
            onDown={() => onChange({ kind: 'maxLoad', load: Math.max(0, score.load - 5) })}
            onUp={() => onChange({ kind: 'maxLoad', load: score.load + 5 })}
          />
        </View>
      )
    case 'emom':
      return (
        <Segmented
          label="Completed"
          value={score.done ? 'done' : 'not'}
          onChange={(v) => onChange({ kind: 'emom', done: v === 'done' })}
          options={[
            { value: 'done', label: 'Done' },
            { value: 'not', label: 'Not done' },
          ]}
        />
      )
  }
}

const styles = StyleSheet.create({
  hint: { fontFamily: font.mono, fontSize: 15, color: color.muted },
  pair: { flexDirection: 'row', gap: 12 },
})
