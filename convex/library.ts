import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { scoreFieldV, sortV } from './domain'
import { requireRole, requireUser } from './users'

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
    return await ctx.db.insert('exercises', { name, description: optional(args.description) })
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
  },
})

const MERGE_BATCH = 200

// Admin cleanup: point every workout and log at `intoId`, then delete `fromId`. Workouts and logs
// have no index by exercise, so this walks them in batches: call again with the returned
// phase/cursor until done. Each batch leaves every reference valid.
export const mergeExercise = mutation({
  args: {
    fromId: v.id('exercises'),
    intoId: v.id('exercises'),
    phase: v.union(v.literal('workouts'), v.literal('logs')),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { fromId, intoId, phase, cursor }) => {
    await requireRole(ctx, 'admin')
    if (fromId === intoId) throw new ConvexError('Pick a different exercise')
    const [from, into] = await Promise.all([ctx.db.get(fromId), ctx.db.get(intoId)])
    if (!from || !into) throw new ConvexError('Exercise not found')

    if (phase === 'workouts') {
      const page = await ctx.db.query('workouts').paginate({ cursor, numItems: MERGE_BATCH })
      for (const w of page.page) {
        if (!w.program.some((s) => s.exercises.some((e) => e.exerciseId === fromId))) continue
        const swap = <E extends { exerciseId: typeof fromId }>(e: E) =>
          e.exerciseId === fromId ? { ...e, exerciseId: intoId } : e
        const program = w.program.map((s) => ({ ...s, exercises: s.exercises.map(swap) }))
        await ctx.db.patch(w._id, { program })
      }
      return page.isDone
        ? { done: false, phase: 'logs' as const, cursor: null }
        : { done: false, phase, cursor: page.continueCursor }
    }

    const page = await ctx.db.query('memberLogs').paginate({ cursor, numItems: MERGE_BATCH })
    for (const l of page.page) {
      if (l.exerciseId === fromId) await ctx.db.patch(l._id, { exerciseId: intoId })
    }
    if (!page.isDone) return { done: false, phase, cursor: page.continueCursor }
    await ctx.db.delete(fromId)
    return { done: true, phase, cursor: null }
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
