import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type QueryCtx } from './_generated/server'
import { isGymStaff, requireClassStaff, requireWorkoutStaff } from './access'
import { programV, type Program } from './domain'
import { releaseAt } from './release'
import { requireUser } from './users'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const checkDate = (d: string) => {
  if (!DATE_RE.test(d)) throw new ConvexError('Date must be YYYY-MM-DD')
  return d
}

const LIMITS = { sections: 20, exercises: 30, prescriptions: 20 }

// Every scored item in a program, keyed by its stable key.
function scoredItems(program: Program) {
  const items = new Map<string, { scoreTypeId: Id<'scoreTypes'>; exerciseId?: Id<'exercises'> }>()
  for (const s of program) {
    if (s.score) items.set(s.key, { scoreTypeId: s.score.scoreTypeId })
    for (const e of s.exercises) {
      if (e.score) items.set(e.key, { scoreTypeId: e.score.scoreTypeId, exerciseId: e.exerciseId })
    }
  }
  return items
}

async function loggedKeys(ctx: QueryCtx, workout: Doc<'workouts'>) {
  const keys = [...scoredItems(workout.program).keys()]
  const hits = await Promise.all(
    keys.map((key) =>
      ctx.db
        .query('memberLogs')
        .withIndex('by_workout_item_score', (q) =>
          q.eq('workoutId', workout._id).eq('itemKey', key),
        )
        .first(),
    ),
  )
  return keys.filter((_, i) => hits[i] !== null)
}

// Release time (epoch ms) of this class's workout on a given date; undefined = no schedule.
async function releaseClock(ctx: QueryCtx, cls: Doc<'classes'>) {
  const gym = cls.release ? await ctx.db.get(cls.gymId) : null
  return (date: string) => releaseAt(date, cls.release, gym?.timeZone)
}

// Clients pass a rounded `asOf` so cached results refresh as time passes; it can't move the
// clock past the server's, so a released-early workout can't be requested.
const nowFor = (asOf: number | undefined) => Math.min(asOf ?? Number.POSITIVE_INFINITY, Date.now())

// Staff of the class's gym, or an athlete in the class.
async function requireWorkoutViewer(ctx: QueryCtx, workout: Doc<'workouts'>) {
  const user = await requireUser(ctx)
  const cls = await ctx.db.get(workout.classId)
  if (!cls) throw new ConvexError('Class not found')
  if (await isGymStaff(ctx, user, cls.gymId)) return { cls, canEdit: true }
  const member = await ctx.db
    .query('classMembers')
    .withIndex('by_class_user', (q) => q.eq('classId', cls._id).eq('userId', user._id))
    .unique()
  if (!member) throw new ConvexError('Forbidden')
  return { cls, canEdit: false }
}

export const listForClassRange = query({
  args: { classId: v.id('classes'), from: v.string(), to: v.string() },
  handler: async (ctx, { classId, from, to }) => {
    const { cls } = await requireClassStaff(ctx, classId)
    const releasesAt = await releaseClock(ctx, cls)
    const rows = await ctx.db
      .query('workouts')
      .withIndex('by_class_date', (q) =>
        q.eq('classId', classId).gte('date', checkDate(from)).lte('date', checkDate(to)),
      )
      .take(62)
    // Week-grid summary: per section, its first exercise or else the first line of its notes.
    const firstExercise = (s: Program[number]) => s.exercises[0]?.exerciseId
    const exerciseIds = [...new Set(rows.flatMap((w) => w.program.map(firstExercise)))].filter(
      (id) => id !== undefined,
    )
    const exercises = await Promise.all(exerciseIds.map((id) => ctx.db.get(id)))
    const exerciseName = new Map(exercises.flatMap((e) => (e ? [[e._id, e.name] as const] : [])))
    const firstLine = (text: string | undefined) => text?.split('\n').find((l) => l.trim())?.trim()
    const sectionLine = (s: Program[number]) => {
      const id = firstExercise(s)
      return (id && exerciseName.get(id)) || firstLine(s.notes)
    }
    return rows.map((w) => ({
      _id: w._id,
      date: w.date,
      title: w.title,
      releasesAt: releasesAt(w.date),
      summary: w.program
        .map(sectionLine)
        .filter((line): line is string => !!line)
        .slice(0, 3)
        .map((line) => (line.length > 60 ? `${line.slice(0, 57)}…` : line)),
    }))
  },
})

// Athlete home: the day's workout for each class they belong to. Date comes from the client.
// A workout not yet released shows as null with its `releasesAt`.
export const myDay = query({
  args: { date: v.string(), asOf: v.optional(v.number()) },
  handler: async (ctx, { date, asOf }) => {
    const user = await requireUser(ctx)
    checkDate(date)
    const now = nowFor(asOf)
    const memberships = await ctx.db
      .query('classMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .take(20)
    const rows = await Promise.all(
      memberships.map(async (m) => {
        const [cls, workout] = await Promise.all([
          ctx.db.get(m.classId),
          ctx.db
            .query('workouts')
            .withIndex('by_class_date', (q) => q.eq('classId', m.classId).eq('date', date))
            .unique(),
        ])
        if (!cls) return null
        const releasesAt = (await releaseClock(ctx, cls))(date)
        const released = releasesAt === undefined || releasesAt <= now
        return {
          classId: cls._id,
          className: cls.name,
          startTime: cls.startTime,
          times: cls.times ?? [cls.startTime],
          releasesAt,
          workout: workout && released ? { _id: workout._id, title: workout.title } : null,
        }
      }),
    )
    return rows.filter((r) => r !== null).sort((a, b) => a.startTime.localeCompare(b.startTime))
  },
})

export const get = query({
  args: { workoutId: v.string(), asOf: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const workoutId = ctx.db.normalizeId('workouts', args.workoutId)
    const workout = workoutId && (await ctx.db.get(workoutId))
    if (!workout) return null
    const { cls, canEdit } = await requireWorkoutViewer(ctx, workout)
    if (!canEdit) {
      const releasesAt = (await releaseClock(ctx, cls))(workout.date)
      if (releasesAt !== undefined && releasesAt > nowFor(args.asOf)) return null
    }
    const sectionIds = [...new Set(workout.program.map((s) => s.sectionId))]
    const exerciseIds = [
      ...new Set(workout.program.flatMap((s) => s.exercises.map((e) => e.exerciseId))),
    ]
    const [sections, exercises, logged] = await Promise.all([
      Promise.all(sectionIds.map((id) => ctx.db.get(id))),
      Promise.all(exerciseIds.map((id) => ctx.db.get(id))),
      canEdit ? loggedKeys(ctx, workout) : Promise.resolve([]),
    ])
    return {
      _id: workout._id,
      classId: cls._id,
      className: cls.name,
      gymId: cls.gymId,
      date: workout.date,
      title: workout.title,
      description: workout.description,
      durationMin: workout.durationMin,
      program: workout.program,
      sectionTitles: Object.fromEntries(sections.flatMap((s) => (s ? [[s._id, s.title]] : []))),
      exerciseNames: Object.fromEntries(exercises.flatMap((e) => (e ? [[e._id, e.name]] : []))),
      loggedKeys: logged,
      canEdit,
    }
  },
})

export const create = mutation({
  args: { classId: v.id('classes'), date: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    const { cls } = await requireClassStaff(ctx, args.classId)
    const date = checkDate(args.date)
    const title = args.title.trim() || cls.name
    const existing = await ctx.db
      .query('workouts')
      .withIndex('by_class_date', (q) => q.eq('classId', cls._id).eq('date', date))
      .first()
    if (existing) throw new ConvexError('This class already has a workout that day')
    return await ctx.db.insert('workouts', { classId: cls._id, date, title, program: [] })
  },
})

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// A coach-owned copy: keeps item keys (logs are per workout), drops the import source.
const copyOf = (w: Doc<'workouts'>, date: string) => ({
  classId: w.classId,
  date,
  title: w.title,
  description: w.description,
  durationMin: w.durationMin,
  program: w.program,
})

async function workoutOn(ctx: QueryCtx, classId: Id<'classes'>, date: string) {
  return await ctx.db
    .query('workouts')
    .withIndex('by_class_date', (q) => q.eq('classId', classId).eq('date', date))
    .first()
}

export const copyDay = mutation({
  args: { workoutId: v.id('workouts'), toDate: v.string() },
  handler: async (ctx, args) => {
    const { workout } = await requireWorkoutStaff(ctx, args.workoutId)
    const toDate = checkDate(args.toDate)
    if (await workoutOn(ctx, workout.classId, toDate)) {
      throw new ConvexError('This class already has a workout that day')
    }
    return await ctx.db.insert('workouts', copyOf(workout, toDate))
  },
})

// Copies each day of the week starting `fromDate` onto the same weekday of the week starting
// `toDate`. Days that already have a workout are left alone.
export const copyWeek = mutation({
  args: { classId: v.id('classes'), fromDate: v.string(), toDate: v.string() },
  handler: async (ctx, args) => {
    await requireClassStaff(ctx, args.classId)
    const fromDate = checkDate(args.fromDate)
    const toDate = checkDate(args.toDate)
    if (fromDate === toDate) throw new ConvexError('Pick a different week')
    const source = await ctx.db
      .query('workouts')
      .withIndex('by_class_date', (q) =>
        q.eq('classId', args.classId).gte('date', fromDate).lte('date', addDays(fromDate, 6)),
      )
      .take(7)
    let copied = 0
    for (const w of source) {
      const offset = (Date.parse(w.date) - Date.parse(fromDate)) / 86_400_000
      const date = addDays(toDate, offset)
      if (await workoutOn(ctx, args.classId, date)) continue
      await ctx.db.insert('workouts', copyOf(w, date))
      copied++
    }
    return { copied, skipped: source.length - copied }
  },
})

// Key-sorted JSON so stored vs incoming objects compare regardless of field order.
const stable = (value: unknown): string =>
  JSON.stringify(value, (_, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  )

async function validateProgram(ctx: QueryCtx, workout: Doc<'workouts'>, program: Program) {
  if (program.length > LIMITS.sections) throw new ConvexError('Too many sections')
  const keys = new Set<string>()
  const claimKey = (key: string) => {
    if (!key || keys.has(key)) throw new ConvexError('Program has duplicate item keys')
    keys.add(key)
  }
  const nonNegative = (n: number | undefined) => n === undefined || (Number.isFinite(n) && n >= 0)
  for (const s of program) {
    claimKey(s.key)
    const exerciseScored = s.exercises.some((e) => e.score)
    if (s.kind === 'test' && (s.score || s.exercises.some((e) => !e.score)))
      throw new ConvexError('Each option of a test is scored on its own')
    if (s.kind === 'metcon' && exerciseScored)
      throw new ConvexError('A metcon is scored as a whole, not per exercise')
    if (s.kind === 'strength' && s.score) throw new ConvexError('Strength is scored per exercise')
    if (s.kind === 'notes' && (s.score || exerciseScored))
      throw new ConvexError('A notes section is not scored')
    if (s.exercises.length > LIMITS.exercises)
      throw new ConvexError('Too many exercises in a section')
    for (const e of s.exercises) {
      claimKey(e.key)
      if (e.prescriptions.length > LIMITS.prescriptions)
        throw new ConvexError('Too many prescription rows')
      for (const p of e.prescriptions) {
        const nums = [
          p.sets,
          p.reps,
          p.weight,
          p.femaleWeight,
          p.distance,
          p.femaleDistance,
          p.percentage,
          p.rpe,
          p.durationSec,
          p.calories,
        ]
        if (!nums.every(nonNegative)) throw new ConvexError('Numbers must be zero or more')
      }
    }
  }
  const scored = scoredItems(program)
  const ids = {
    sections: [...new Set(program.map((s) => s.sectionId))],
    exercises: [...new Set(program.flatMap((s) => s.exercises.map((e) => e.exerciseId)))],
    scoreTypes: [...new Set([...scored.values()].map((i) => i.scoreTypeId))],
  }
  const found = await Promise.all([
    ...ids.sections.map((id) => ctx.db.get(id)),
    ...ids.exercises.map((id) => ctx.db.get(id)),
    ...ids.scoreTypes.map((id) => ctx.db.get(id)),
  ])
  if (found.some((d) => d === null))
    throw new ConvexError('Program references a deleted library item')

  // Items members already logged must keep their key, score type and exercise.
  const before = scoredItems(workout.program)
  for (const key of await loggedKeys(ctx, workout)) {
    const prev = before.get(key)
    const next = scored.get(key)
    if (!next || next.scoreTypeId !== prev?.scoreTypeId || next.exerciseId !== prev?.exerciseId) {
      throw new ConvexError(
        'Members have logged results on an item you removed or changed scoring for',
      )
    }
  }
}

export const save = mutation({
  args: {
    workoutId: v.id('workouts'),
    title: v.string(),
    description: v.optional(v.string()),
    durationMin: v.optional(v.number()),
    program: programV,
  },
  handler: async (ctx, { workoutId, ...args }) => {
    const { workout } = await requireWorkoutStaff(ctx, workoutId)
    const title = args.title.trim()
    if (!title) throw new ConvexError('Title is required')
    if (args.durationMin !== undefined && !(args.durationMin > 0 && args.durationMin <= 600)) {
      throw new ConvexError('Duration must be 1–600 minutes')
    }
    await validateProgram(ctx, workout, args.program)
    const next = {
      title,
      description: args.description?.trim() || undefined,
      durationMin: args.durationMin,
      program: args.program,
    }
    const prev = {
      title: workout.title,
      description: workout.description,
      durationMin: workout.durationMin,
      program: workout.program,
    }
    if (stable(prev) !== stable(next)) await ctx.db.patch(workoutId, next)
  },
})

export const remove = mutation({
  args: { workoutId: v.id('workouts') },
  handler: async (ctx, { workoutId }) => {
    await requireWorkoutStaff(ctx, workoutId)
    const log = await ctx.db
      .query('memberLogs')
      .withIndex('by_workout_item_score', (q) => q.eq('workoutId', workoutId))
      .first()
    if (log) throw new ConvexError('Members have logged results for this workout')
    await ctx.db.delete(workoutId)
  },
})
