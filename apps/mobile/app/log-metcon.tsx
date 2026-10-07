import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { METCON_LABEL, repsPerRound } from '../src/data/rules'
import { useStore } from '../src/data/store'
import type { Division, MetconPart, MetconScore } from '../src/data/types'
import { Button, Field, Layout, Screen, Segmented, Stepper, Text } from '../src/ui'
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

  const save = () => {
    store.saveResult(workout.id, { kind: 'metcon', division, score, notes: notes.trim() || undefined, loggedAt: store.today })
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  return (
    <Screen header={{ nav: 'close', eyebrow: 'Metcon' }} footer={<Button label="Save" onPress={save} />}>
      <Text variant="title" className="-mt-4">
        {METCON_LABEL[metcon.type]} <Text variant="mono">{HINT[metcon.type]}</Text>
      </Text>

      <Layout className="mt-[18px]">
        <MetconItems metcon={metcon} compact />
      </Layout>

      <Layout className="mt-6">
        <ScoreInput metcon={metcon} score={score} onChange={setScore} />
      </Layout>

      <Layout className="mt-5">
        <Segmented
          label="Division"
          value={division}
          onChange={setDivision}
          options={[
            { value: 'rx', label: 'Rx' },
            { value: 'scaled', label: 'Scaled' },
          ]}
        />
      </Layout>

      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="How did it feel?" multiline className="mt-5" />
    </Screen>
  )
}

/** Score input depends on metcon type (handoff §3). */
function ScoreInput({ metcon, score, onChange }: { metcon: MetconPart; score: MetconScore; onChange: (s: MetconScore) => void }) {
  switch (score.kind) {
    case 'amrap': {
      const maxReps = Math.max(0, repsPerRound(metcon) - 1)
      return (
        <Layout row gap={3}>
          <Stepper
            label="Rounds"
            name="rounds"
            value={String(score.rounds)}
            onDown={() => onChange({ ...score, rounds: clamp(score.rounds - 1, 0, 99) })}
            onUp={() => onChange({ ...score, rounds: clamp(score.rounds + 1, 0, 99) })}
          />
          <Stepper
            label="+ Reps"
            name="reps"
            value={String(score.reps)}
            onDown={() => onChange({ ...score, reps: clamp(score.reps - 1, 0, maxReps) })}
            onUp={() => onChange({ ...score, reps: clamp(score.reps + 1, 0, maxReps) })}
          />
        </Layout>
      )
    }
    case 'forTime': {
      const capped = score.cappedReps !== undefined
      const sec = score.timeSec ?? 0
      const cap = metcon.timeCapSec ?? 60 * 60
      const setSec = (v: number) => onChange({ kind: 'forTime', timeSec: clamp(v, 0, cap) })
      return (
        <Layout gap={3}>
          <Segmented
            label="Finished or capped"
            value={capped ? 'cap' : 'done'}
            onChange={(v) => onChange(v === 'cap' ? { kind: 'forTime', cappedReps: 0 } : { kind: 'forTime', timeSec: Math.round(cap * 0.75) })}
            options={[
              { value: 'done', label: 'Finished' },
              { value: 'cap', label: 'Hit the cap' },
            ]}
          />
          {capped ? (
            <Layout row gap={3}>
              <Stepper
                label="Reps at cap"
                name="reps"
                value={String(score.cappedReps)}
                onDown={() => onChange({ kind: 'forTime', cappedReps: Math.max(0, (score.cappedReps ?? 0) - 1) })}
                onUp={() => onChange({ kind: 'forTime', cappedReps: (score.cappedReps ?? 0) + 1 })}
              />
            </Layout>
          ) : (
            <Layout row gap={3}>
              <Stepper label="Min" name="minutes" value={String(Math.floor(sec / 60))} onDown={() => setSec(sec - 60)} onUp={() => setSec(sec + 60)} />
              <Stepper label="Sec" name="seconds" value={String(sec % 60).padStart(2, '0')} onDown={() => setSec(sec - 5)} onUp={() => setSec(sec + 5)} />
            </Layout>
          )}
        </Layout>
      )
    }
    case 'maxLoad':
      return (
        <Layout row gap={3}>
          <Stepper
            label="Load · lb"
            name="pounds"
            value={String(score.load)}
            onDown={() => onChange({ kind: 'maxLoad', load: Math.max(0, score.load - 5) })}
            onUp={() => onChange({ kind: 'maxLoad', load: score.load + 5 })}
          />
        </Layout>
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
