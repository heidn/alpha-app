import { v, type Infer } from 'convex/values'

// Dependency-free: imported by schema.ts and the client.
export const genderV = v.union(v.literal('male'), v.literal('female'))
export const weightUnitV = v.union(v.literal('kg'), v.literal('lb'))
export const distanceUnitV = v.union(v.literal('m'), v.literal('km'), v.literal('mi'))

// MemberSet field names a score type can ask for.
export const SCORE_FIELDS = ['reps', 'weight', 'timeSeconds', 'rounds', 'distance', 'done'] as const
export const scoreFieldV = v.union(
  v.literal('reps'),
  v.literal('weight'),
  v.literal('timeSeconds'),
  v.literal('rounds'),
  v.literal('distance'),
  v.literal('done'),
)
export const sortV = v.union(v.literal('asc'), v.literal('desc'))

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
  rpe: v.optional(v.number()),
  customText: v.optional(v.string()),
})

// `key`: client-generated, stable across reorders; memberLogs.itemKey points at it.
export const programExerciseV = v.object({
  key: v.string(),
  exerciseId: v.id('exercises'),
  score: v.optional(scoreV),
  prescriptions: v.array(prescriptionV),
})

export const programSectionV = v.object({
  key: v.string(),
  sectionId: v.id('sections'),
  notes: v.optional(v.string()),
  score: v.optional(scoreV),
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
  done: v.optional(v.boolean()),
})

export type ScoreField = Infer<typeof scoreFieldV>
export type Prescription = Infer<typeof prescriptionV>
export type ProgramSection = Infer<typeof programSectionV>
export type Program = Infer<typeof programV>
