import { v, type Infer } from 'convex/values'

// Dependency-free: imported by schema.ts and the client.
export const genderV = v.union(v.literal('male'), v.literal('female'))
export const weightUnitV = v.union(v.literal('kg'), v.literal('lb'))
export const distanceUnitV = v.union(v.literal('m'), v.literal('km'), v.literal('mi'))

// MemberSet field names a score type can ask for.
export const SCORE_FIELDS = ['reps', 'weight', 'timeSeconds', 'rounds', 'distance', 'calories', 'done'] as const
export const scoreFieldV = v.union(
  v.literal('reps'),
  v.literal('weight'),
  v.literal('timeSeconds'),
  v.literal('rounds'),
  v.literal('distance'),
  v.literal('calories'),
  v.literal('done'),
)
export const sortV = v.union(v.literal('asc'), v.literal('desc'))

// When athletes see a class's workouts: the day before or the day of, at `time` (gym local).
export const releaseV = v.object({
  day: v.union(v.literal('before'), v.literal('same')),
  time: v.string(), // "20:00"
})
export type Release = Infer<typeof releaseV>

export const bookingStatusV = v.union(v.literal('booked'), v.literal('signedIn'))

// A 1RM the app can't derive from logged sets: a coach-run test or one carried over from the old app.
// Logged singles are read from memberLogs instead, so they're never stored twice.
export const recordedMaxV = v.object({
  exerciseId: v.id('exercises'),
  weight: v.number(),
  unit: weightUnitV,
  achievedAt: v.string(), // "2026-05-12"
})

// Present = members log this item; absent = display-only.
export const scoreV = v.object({ scoreTypeId: v.id('scoreTypes'), title: v.string() })

// One row per prescription: 1x5 @ 70%, then 1x3 @ 80%. female* only when different.
export const prescriptionV = v.object({
  sets: v.optional(v.number()),
  reps: v.optional(v.number()),
  weight: v.optional(v.number()),
  femaleWeight: v.optional(v.number()),
  weightUnit: v.optional(weightUnitV),
  distance: v.optional(v.number()),
  femaleDistance: v.optional(v.number()),
  distanceUnit: v.optional(distanceUnitV),
  percentage: v.optional(v.number()),
  percentageMax: v.optional(v.number()), // range: 75-80% = percentage 75, percentageMax 80
  rpe: v.optional(v.number()),
  rpeMax: v.optional(v.number()),
  customText: v.optional(v.string()),
})

// `key`: client-generated, stable across reorders; memberLogs.itemKey points at it.
export const programExerciseV = v.object({
  key: v.string(),
  exerciseId: v.id('exercises'),
  score: v.optional(scoreV),
  prescriptions: v.array(prescriptionV),
})

// How a metcon runs; intervals = "N sets, M:SS on // M:SS off".
export const metconFormatV = v.union(
  v.literal('forTime'),
  v.literal('amrap'),
  v.literal('emom'),
  v.literal('intervals'),
)

export const programSectionV = v.object({
  key: v.string(),
  sectionId: v.id('sections'),
  notes: v.optional(v.string()),
  score: v.optional(scoreV),
  format: v.optional(metconFormatV),
  timeCapSec: v.optional(v.number()), // AMRAP/EMOM/intervals length, For Time cap
  exercises: v.array(programExerciseV),
})

export const programV = v.array(programSectionV)

export const memberSetV = v.object({
  setNumber: v.number(),
  reps: v.optional(v.number()),
  weight: v.optional(v.number()),
  timeSeconds: v.optional(v.number()),
  rounds: v.optional(v.number()),
  distance: v.optional(v.number()),
  calories: v.optional(v.number()),
  done: v.optional(v.boolean()),
})

// Where imported data came from; absent = made in this app.
export const sourceV = v.literal('wodify')

export type MetconFormat = Infer<typeof metconFormatV>
export type MemberSet = Infer<typeof memberSetV>
export type ScoreField = Infer<typeof scoreFieldV>
export type Prescription = Infer<typeof prescriptionV>
export type ProgramSection = Infer<typeof programSectionV>
export type Program = Infer<typeof programV>
