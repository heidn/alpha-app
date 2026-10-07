// Demo data relative to today, until the app reads from Convex.
// Today matches the Claude Design mockup (Deadlift 5 × 5 @ 60%, 3-movement AMRAP).
import { addDays, fromISO } from './dates'
import type {
  Booking,
  ClassSession,
  ISODate,
  LiftResult,
  MetconResult,
  Movement,
  TestedMax,
  Workout,
} from './types'

const TRACK = 'Woodbury - Alpha'

export const movements: Record<string, Movement> = Object.fromEntries(
  (
    [
      ['cardio', 'Cardio'],
      ['bandedLateralWalk', 'Banded lateral walk'],
      ['serratusSlides', 'Banded serratus slides'],
      ['thoracicRotation', '½ kneeling thoracic rotations'],
      ['rdl', 'RDL'],
      ['strictPress', 'Strict press'],
      ['boxStepOver', 'Box step overs'],
      ['deadlift', 'Deadlift'],
      ['backSquat', 'Back squat'],
      ['benchPress', 'Bench press'],
      ['shuttleRun', 'Shuttle runs'],
      ['dbHangCleanJerk', 'Alt. single-arm DB hang clean & jerk'],
      ['dbBoxStepOver', 'DB box step overs'],
      ['pvcPassThrough', 'PVC pass-throughs'],
      ['airSquat', 'Air squats'],
      ['inchworm', 'Inchworms'],
      ['thruster', 'Thrusters'],
      ['pullUp', 'Pull-ups'],
      ['row', 'Row (cal)'],
      ['wallBall', 'Wall balls'],
      ['burpee', 'Burpees'],
      ['kbSwing', 'KB swings'],
      ['pushUp', 'Push-ups'],
    ] as const
  ).map(([id, name]) => [id, { id, name }]),
)

export function buildFixtures(today: ISODate) {
  const d = (offset: number) => addDays(today, offset)

  const workouts: Workout[] = [
    {
      id: 'w-today',
      date: today,
      track: TRACK,
      warmup: [
        { qty: '2:00', movementId: 'cardio' },
        { qty: '3×5 ea', movementId: 'bandedLateralWalk' },
        { qty: '10', movementId: 'serratusSlides' },
        { qty: '5 ea', movementId: 'thoracicRotation' },
        { qty: '5', movementId: 'rdl' },
        { qty: '5', movementId: 'strictPress' },
        { qty: '10', movementId: 'boxStepOver' },
      ],
      lift: { movementId: 'deadlift', sets: 5, reps: 5, percent: 60 },
      metcon: {
        type: 'amrap',
        timeCapSec: 12 * 60,
        items: [
          { reps: 10, movementId: 'shuttleRun', spec: '2 × 25′' },
          { reps: 10, movementId: 'dbHangCleanJerk', rxHeavy: 50, rxLight: 35 },
          { reps: 10, movementId: 'dbBoxStepOver', rxHeavy: 50, rxLight: 35, spec: '20″ box' },
        ],
      },
    },
    {
      id: 'w-m2',
      date: d(-2),
      track: TRACK,
      warmup: [
        { qty: '2:00', movementId: 'cardio' },
        { qty: '10', movementId: 'pushUp' },
        { qty: '10', movementId: 'pvcPassThrough' },
      ],
      lift: { movementId: 'benchPress', sets: 4, reps: 6, percent: 70 },
      metcon: {
        type: 'emom',
        timeCapSec: 10 * 60,
        items: [
          { reps: 12, movementId: 'kbSwing', rxHeavy: 53, rxLight: 35 },
          { reps: 8, movementId: 'burpee' },
        ],
      },
    },
    {
      id: 'w-m4',
      date: d(-4),
      track: TRACK,
      warmup: [
        { qty: '2:00', movementId: 'cardio' },
        { qty: '10', movementId: 'airSquat' },
        { qty: '5', movementId: 'inchworm' },
      ],
      lift: { movementId: 'strictPress', sets: 5, reps: 5, percent: 65 },
      metcon: {
        type: 'forTime',
        timeCapSec: 12 * 60,
        items: [
          { reps: 21, movementId: 'row' },
          { reps: 21, movementId: 'wallBall', rxHeavy: 20, rxLight: 14 },
          { reps: 21, movementId: 'burpee' },
        ],
      },
    },
    {
      id: 'w-m6',
      date: d(-6),
      track: TRACK,
      warmup: [
        { qty: '2:00', movementId: 'cardio' },
        { qty: '10', movementId: 'pvcPassThrough' },
        { qty: '10', movementId: 'airSquat' },
        { qty: '5', movementId: 'inchworm' },
      ],
      lift: { movementId: 'backSquat', sets: 5, reps: 3, percent: 75 },
      metcon: {
        type: 'amrap',
        timeCapSec: 10 * 60,
        items: [
          { reps: 10, movementId: 'thruster', rxHeavy: 95, rxLight: 65 },
          { reps: 10, movementId: 'pullUp', spec: 'Banded' },
        ],
      },
    },
    {
      id: 'w-m21',
      date: d(-21),
      track: TRACK,
      warmup: [{ qty: '2:00', movementId: 'cardio' }, { qty: '5', movementId: 'rdl' }],
      lift: { movementId: 'deadlift', sets: 3, reps: 5, percent: 85 },
      metcon: {
        type: 'maxLoad',
        items: [{ reps: 1, movementId: 'thruster', spec: 'Max in 8:00' }],
      },
    },
    {
      id: 'w-m42',
      date: d(-42),
      track: TRACK,
      warmup: [{ qty: '2:00', movementId: 'cardio' }, { qty: '5', movementId: 'rdl' }],
      lift: { movementId: 'deadlift', sets: 5, reps: 5, percent: 60 },
      metcon: {
        type: 'amrap',
        timeCapSec: 12 * 60,
        items: [
          { reps: 15, movementId: 'wallBall', rxHeavy: 20, rxLight: 14 },
          { reps: 10, movementId: 'kbSwing', rxHeavy: 53, rxLight: 35 },
        ],
      },
    },
  ]

  const liftSets = (reps: number, weights: number[]) => weights.map((weight) => ({ reps, weight }))
  const results: Record<string, LiftResult | MetconResult> = {
    'w-m2:lift': { kind: 'lift', sets: liftSets(6, [135, 135, 140, 140]), loggedAt: d(-2) },
    'w-m2:metcon': { kind: 'metcon', division: 'rx', score: { kind: 'emom', done: true }, loggedAt: d(-2) },
    'w-m4:lift': { kind: 'lift', sets: liftSets(5, [85, 85, 90, 90, 90]), loggedAt: d(-4) },
    'w-m4:metcon': {
      kind: 'metcon',
      division: 'rx',
      score: { kind: 'forTime', timeSec: 9 * 60 + 42 },
      loggedAt: d(-4),
    },
    'w-m6:lift': {
      kind: 'lift',
      sets: liftSets(3, [205, 205, 215, 215, 225]),
      notes: 'Last set moved fast.',
      loggedAt: d(-6),
    },
    'w-m6:metcon': {
      kind: 'metcon',
      division: 'scaled',
      score: { kind: 'amrap', rounds: 5, reps: 12 },
      loggedAt: d(-6),
    },
    'w-m21:lift': { kind: 'lift', sets: liftSets(5, [255, 260, 265]), loggedAt: d(-21) },
    'w-m21:metcon': { kind: 'metcon', division: 'rx', score: { kind: 'maxLoad', load: 135 }, loggedAt: d(-21) },
    'w-m42:lift': { kind: 'lift', sets: liftSets(5, [180, 180, 180, 180, 180]), loggedAt: d(-42) },
    'w-m42:metcon': {
      kind: 'metcon',
      division: 'rx',
      score: { kind: 'amrap', rounds: 6, reps: 3 },
      loggedAt: d(-42),
    },
  }

  // Tested more than 90 days ago, so today's prescription uses the projected max.
  const testedMaxes: TestedMax[] = [
    { movementId: 'deadlift', weight: 295, achievedAt: d(-148) },
    { movementId: 'backSquat', weight: 275, achievedAt: d(-30) },
  ]

  const bookings: Record<ISODate, Booking> = { [today]: { classSessionId: `${today}@06:00`, status: 'booked' } }
  for (const w of workouts) {
    if (w.date !== today) bookings[w.date] = { classSessionId: `${w.date}@06:00`, status: 'signedIn' }
  }

  return { workouts, results, testedMaxes, bookings }
}

const WEEKDAY_TIMES = ['05:00', '06:00', '09:30', '12:00', '16:30']
const SATURDAY_TIMES = ['08:00', '09:00']

/** The gym's fixed weekly schedule. 4:30 PM has no cap ("Open"). */
export function classesOn(date: ISODate): ClassSession[] {
  const dow = fromISO(date).getDay()
  const times = dow === 0 ? [] : dow === 6 ? SATURDAY_TIMES : WEEKDAY_TIMES
  const seed = Number(date.replaceAll('-', ''))
  return times.map((startsAt, i) => ({
    id: `${date}@${startsAt}`,
    date,
    startsAt,
    capacity: startsAt === '16:30' ? undefined : 12,
    athletes: ((seed + i * 7) % 8) + 1,
  }))
}
