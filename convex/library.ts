import { ConvexError, v, type Infer } from 'convex/values'
import { internalMutation, mutation, query, type MutationCtx } from './_generated/server'
import { distanceUnitV, scoreFieldV, sortV, type ProgramSection } from './domain'
import { requireRole, requireUser } from './users'
import { fixedLabel, movementTest, toPrescription, variantOf, type Fixed } from './variants'
import { movementId, testSection } from './wodifyImport'
import { linkParts } from './complexes'

// Shared library: any staff can add; only admins edit. Exercises are removed only by merging
// into another (workouts and logs reference them by id).

const required = (value: string, label: string) => {
  const s = value.trim()
  if (!s) throw new ConvexError(`${label} is required`)
  return s
}
const optional = (value?: string) => value?.trim() || undefined

export const listSections = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, 'admin', 'coach')
    const rows = await ctx.db.query('sections').withIndex('by_title').take(200)
    return rows.map((s) => ({ _id: s._id, title: s.title, description: s.description }))
  },
})

export const createSection = mutation({
  args: { title: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, 'admin', 'coach')
    const title = required(args.title, 'Title')
    const dupe = await ctx.db
      .query('sections')
      .withIndex('by_title', (q) => q.eq('title', title))
      .first()
    if (dupe) return dupe._id
    return await ctx.db.insert('sections', { title, description: optional(args.description) })
  },
})

export const updateSection = mutation({
  args: { sectionId: v.id('sections'), title: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, { sectionId, ...args }) => {
    await requireRole(ctx, 'admin')
    const s = await ctx.db.get(sectionId)
    if (!s) throw new ConvexError('Section not found')
    const next = { title: required(args.title, 'Title'), description: optional(args.description) }
    if (s.title !== next.title || s.description !== next.description) {
      await ctx.db.patch(sectionId, next)
    }
  },
})

export const listExercises = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }) => {
    await requireRole(ctx, 'admin', 'coach')
    const term = search?.trim()
    const rows = term
      ? await ctx.db
          .query('exercises')
          .withSearchIndex('search_name', (q) => q.search('name', term))
          .take(20)
      : await ctx.db.query('exercises').withIndex('by_name').take(200)
    return rows.map((e) => ({ _id: e._id, name: e.name, description: e.description }))
  },
})

export const createExercise = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, 'admin', 'coach')
    const name = required(args.name, 'Name')
    const dupe = await ctx.db
      .query('exercises')
      .withIndex('by_name', (q) => q.eq('name', name))
      .first()
    if (dupe) return dupe._id
    const id = await ctx.db.insert('exercises', { name, description: optional(args.description) })
    await linkParts(ctx, id)
    return id
  },
})

export const updateExercise = mutation({
  args: { exerciseId: v.id('exercises'), name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, { exerciseId, ...args }) => {
    await requireRole(ctx, 'admin')
    const e = await ctx.db.get(exerciseId)
    if (!e) throw new ConvexError('Exercise not found')
    const next = { name: required(args.name, 'Name'), description: optional(args.description) }
    if (e.name !== next.name || e.description !== next.description) {
      await ctx.db.patch(exerciseId, next)
    }
    if (e.name !== next.name) await linkParts(ctx, exerciseId)
  },
})

const MERGE_BATCH = 200
const TEMPLATE_LIMIT = 500
const USE_SCAN_LIMIT = 8000

// Admin cleanup: point every workout, template, log and recorded 1RM at `intoId`, then delete
// `fromId`. Workouts, logs and users have no index by exercise, so this walks them in batches:
// call again with the returned phase/cursor until done. Each batch leaves every reference valid.
// "1000m row" → Row keeps its distance as the variant on every workout and result.
const fixedV = v.object({
  amount: v.number(),
  unit: v.union(distanceUnitV, v.literal('min'), v.literal('cal'), v.literal('reps')),
})
const mergeArgs = {
  fromId: v.id('exercises'),
  intoId: v.id('exercises'),
  phase: v.union(v.literal('workouts'), v.literal('logs'), v.literal('users')),
  cursor: v.union(v.string(), v.null()),
  fixed: v.optional(fixedV),
}
const mergeArgsV = v.object(mergeArgs)
type MergeArgs = Infer<typeof mergeArgsV>
type Step = { done: boolean; phase: MergeArgs['phase']; cursor: string | null }

async function mergeStep(ctx: MutationCtx, a: MergeArgs): Promise<Step> {
  const { fromId, intoId, phase, cursor, fixed } = a
  if (fixed && !(fixed.amount > 0)) throw new ConvexError('Amount must be more than zero')
  if (fromId === intoId) throw new ConvexError('Pick a different exercise')
  const [from, into] = await Promise.all([ctx.db.get(fromId), ctx.db.get(intoId)])
  if (!from || !into) throw new ConvexError('Exercise not found')
  const swap = <E extends ProgramSection['exercises'][number]>(e: E) =>
    e.exerciseId !== fromId
      ? e
      : {
          ...e,
          exerciseId: intoId,
          prescriptions: fixed ? withFixed(e.prescriptions, fixed) : e.prescriptions,
        }
  const uses = (s: ProgramSection) => s.exercises.some((e) => e.exerciseId === fromId)
  const next = (p: Step['phase']): Step => ({ done: false, phase: p, cursor: null })

  if (phase === 'workouts') {
    const page = await ctx.db.query('workouts').paginate({ cursor, numItems: MERGE_BATCH })
    for (const w of page.page) {
      if (!w.program.some(uses)) continue
      const program = w.program.map((s) => ({ ...s, exercises: s.exercises.map(swap) }))
      await ctx.db.patch(w._id, { program })
    }
    if (!page.isDone) return { done: false, phase, cursor: page.continueCursor }
    for (const t of await ctx.db.query('sectionTemplates').take(TEMPLATE_LIMIT)) {
      if (uses(t.section))
        await ctx.db.patch(t._id, {
          section: { ...t.section, exercises: t.section.exercises.map(swap) },
        })
    }
    return next('logs')
  }

  if (phase === 'logs') {
    const page = await ctx.db.query('memberLogs').paginate({ cursor, numItems: MERGE_BATCH })
    for (const l of page.page) {
      if (l.exerciseId === fromId)
        await ctx.db.patch(l._id, {
          exerciseId: intoId,
          ...(fixed ? { variant: fixedLabel(fixed) } : {}),
        })
    }
    return page.isDone ? next('users') : { done: false, phase, cursor: page.continueCursor }
  }

  // Recorded 1RMs: one per exercise, so keep the heavier when the athlete has both.
  const page = await ctx.db.query('users').paginate({ cursor, numItems: MERGE_BATCH })
  for (const u of page.page) {
    const old = u.maxes?.find((m) => m.exerciseId === fromId)
    if (!old || !u.maxes) continue
    const kept = u.maxes.find((m) => m.exerciseId === intoId)
    const rest = u.maxes.filter((m) => m.exerciseId !== fromId && m.exerciseId !== intoId)
    const best = kept && kept.weight >= old.weight ? kept : { ...old, exerciseId: intoId }
    await ctx.db.patch(u._id, { maxes: [...rest, best] })
  }
  if (!page.isDone) return { done: false, phase, cursor: page.continueCursor }
  await ctx.db.delete(fromId)
  return { done: true, phase, cursor: null }
}

export const mergeExercise = mutation({
  args: mergeArgs,
  handler: async (ctx, args) => {
    await requireRole(ctx, 'admin')
    return await mergeStep(ctx, args)
  },
})

// Same as mergeExercise, for one-off cleanups from the CLI (`npx convex run`).
export const mergeExerciseInternal = internalMutation({
  args: mergeArgs,
  handler: async (ctx, args) => await mergeStep(ctx, args),
})

// CLI cleanup: delete exercises nothing points at (junk names). Logs only get an exerciseId copied
// from a workout item, so an exercise no workout, template or 1RM uses has no results either.
export const deleteUnusedExercises = internalMutation({
  args: { exerciseIds: v.array(v.id('exercises')) },
  handler: async (ctx, { exerciseIds }) => {
    const ids = new Set<string>(exerciseIds)
    const used = new Set<string>()
    const workouts = await ctx.db.query('workouts').take(USE_SCAN_LIMIT)
    const templates = await ctx.db.query('sectionTemplates').take(TEMPLATE_LIMIT)
    const users = await ctx.db.query('users').take(USE_SCAN_LIMIT)
    if (workouts.length === USE_SCAN_LIMIT || users.length === USE_SCAN_LIMIT)
      throw new ConvexError('Too much data to check in one go')
    for (const s of [...workouts.flatMap((w) => w.program), ...templates.map((t) => t.section)])
      for (const e of s.exercises) if (ids.has(e.exerciseId)) used.add(e.exerciseId)
    for (const u of users) for (const m of u.maxes ?? []) if (ids.has(m.exerciseId)) used.add(m.exerciseId)
    const deleted: string[] = []
    for (const id of exerciseIds) {
      const e = await ctx.db.get(id)
      if (!e || used.has(id)) continue
      await ctx.db.delete(id)
      deleted.push(e.name)
    }
    return { deleted, kept: [...used] }
  },
})

const withFixed = (rows: ProgramSection['exercises'][number]['prescriptions'], fixed: Fixed) => {
  const [first, ...rest] = rows.length ? rows : [{}]
  return [{ ...first, ...toPrescription(fixed) }, ...rest]
}

const LINK_BATCH = 50

// One-time / repeatable admin pass, in batches like mergeExercise: whole-section "2k Row" /
// "1-Mile Run" metcons become one-option tests (Row · 2000 m), and every log on a movement item
// gets its exerciseId + variant, so history groups by movement and distance.
export const linkMovementTests = mutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    await requireRole(ctx, 'admin')
    const page = await ctx.db.query('workouts').paginate({ cursor, numItems: LINK_BATCH })
    let sections = 0
    let logs = 0
    for (const w of page.page) {
      const program: ProgramSection[] = []
      for (const s of w.program) {
        const test = !s.kind && s.score && s.exercises.length === 0 && movementTest(s.score.title)
        if (test) {
          program.push(testSection(s, await movementId(ctx, test.movement), test.fixed))
          sections++
        } else program.push(s)
      }
      if (program.some((s, i) => s !== w.program[i])) await ctx.db.patch(w._id, { program })
      for (const s of program) {
        for (const e of s.exercises) {
          const variant = variantOf(s, e)
          if (!e.score || !variant) continue
          const rows = await ctx.db
            .query('memberLogs')
            .withIndex('by_workout_item_score', (q) => q.eq('workoutId', w._id).eq('itemKey', e.key))
            .take(500)
          for (const l of rows) {
            if (l.exerciseId === e.exerciseId && l.variant === variant) continue
            await ctx.db.patch(l._id, { exerciseId: e.exerciseId, variant })
            logs++
          }
        }
      }
    }
    return { done: page.isDone, cursor: page.continueCursor, sections, logs }
  },
})

// Readable by any signed-in user: athletes need it to log results.
export const listScoreTypes = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx)
    const rows = await ctx.db.query('scoreTypes').withIndex('by_name').take(50)
    return rows.map((s) => ({
      _id: s._id,
      name: s.name,
      fields: s.fields,
      perSet: s.perSet,
      sort: s.sort,
    }))
  },
})

const scoreTypeArgs = {
  name: v.string(),
  fields: v.array(scoreFieldV),
  perSet: v.boolean(),
  sort: sortV,
}

const cleanScoreType = (args: { name: string; fields: string[] }) => {
  if (args.fields.length === 0) throw new ConvexError('Pick at least one field')
  return required(args.name, 'Name')
}

export const createScoreType = mutation({
  args: scoreTypeArgs,
  handler: async (ctx, args) => {
    await requireRole(ctx, 'admin')
    const name = cleanScoreType(args)
    return await ctx.db.insert('scoreTypes', {
      ...args,
      name,
      fields: [...new Set(args.fields)],
    })
  },
})

export const updateScoreType = mutation({
  args: { scoreTypeId: v.id('scoreTypes'), ...scoreTypeArgs },
  handler: async (ctx, { scoreTypeId, ...args }) => {
    await requireRole(ctx, 'admin')
    const s = await ctx.db.get(scoreTypeId)
    if (!s) throw new ConvexError('Score type not found')
    const next = { ...args, name: cleanScoreType(args), fields: [...new Set(args.fields)] }
    const same =
      s.name === next.name &&
      s.perSet === next.perSet &&
      s.sort === next.sort &&
      s.fields.join() === next.fields.join()
    if (!same) await ctx.db.patch(scoreTypeId, next)
  },
})
