import { paginationOptsValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx } from './_generated/server'
import type { ProgramSection } from './domain'
import { requireRole } from './users'
import {
  isScoreTypeName,
  itemKey,
  norm,
  parseResults,
  SCORE_TYPES,
  sortMetric,
  stripHtml,
  type ScoreTypeName,
} from './wodify'

// Wodify performance results -> users, workouts, memberLogs. Admin-only.
// The client sends a file in small chunks; every call is an idempotent upsert, so a whole file
// can be re-run (or resumed after a failure) without duplicating anything. A gym's history can't
// fit one transaction, so this is deliberately chunked rather than one mutation.

const SECTION = 'Metcon'
const MAX = { athletes: 100, days: 50, logs: 200, sections: 20 }

function limit(n: number, max: number, what: string) {
  if (n > max) throw new ConvexError(`Send at most ${max} ${what} at a time`)
}

async function scoreTypeIds(ctx: MutationCtx) {
  const cache = new Map<ScoreTypeName, Id<'scoreTypes'>>()
  return async (name: ScoreTypeName) => {
    if (!cache.has(name)) {
      const st = await ctx.db
        .query('scoreTypes')
        .withIndex('by_name', (q) => q.eq('name', name))
        .first()
      if (!st) throw new ConvexError(`Score type "${name}" is missing: start the import again`)
      cache.set(name, st._id)
    }
    return cache.get(name)!
  }
}

// Library rows the import points at: the Metcon section and the score types it uses.
export const prepare = mutation({
  args: { scoreTypes: v.array(v.string()) },
  handler: async (ctx, { scoreTypes }) => {
    await requireRole(ctx, 'admin')
    limit(scoreTypes.length, Object.keys(SCORE_TYPES).length, 'score types')
    const section = await ctx.db
      .query('sections')
      .withIndex('by_title', (q) => q.eq('title', SECTION))
      .first()
    if (!section) await ctx.db.insert('sections', { title: SECTION })
    for (const name of new Set(scoreTypes)) {
      if (!isScoreTypeName(name)) throw new ConvexError(`Unknown score type "${name}"`)
      const existing = await ctx.db
        .query('scoreTypes')
        .withIndex('by_name', (q) => q.eq('name', name))
        .first()
      if (!existing) {
        const { fields, perSet, sort } = SCORE_TYPES[name]
        await ctx.db.insert('scoreTypes', { name, fields: [...fields], perSet, sort })
      }
    }
  },
})

// Wodify client -> users row. Matched by Client ID, else linked to the one user with that name,
// else created unclaimed (no tokenIdentifier) until they sign in (users.store claims by name).
// Every athlete joins the class so the history is there when they sign in.
export const upsertAthletes = mutation({
  args: {
    classId: v.id('classes'),
    athletes: v.array(v.object({ wodifyId: v.string(), name: v.string() })),
  },
  handler: async (ctx, { classId, athletes }) => {
    await requireRole(ctx, 'admin')
    limit(athletes.length, MAX.athletes, 'athletes')
    const cls = await ctx.db.get(classId)
    if (!cls) throw new ConvexError('Class not found')
    const join = async (userId: Id<'users'>) => {
      const member = await ctx.db
        .query('classMembers')
        .withIndex('by_class_user', (q) => q.eq('classId', classId).eq('userId', userId))
        .first()
      if (!member) await ctx.db.insert('classMembers', { classId, userId, gymId: cls.gymId })
    }
    const out: { wodifyId: string; userId: Id<'users'> }[] = []
    let created = 0
    for (const a of athletes) {
      const wodifyId = a.wodifyId.trim()
      const name = a.name.trim()
      if (!wodifyId || !name) throw new ConvexError('Athlete id and name are required')
      const known = await ctx.db
        .query('users')
        .withIndex('by_wodifyId', (q) => q.eq('wodifyId', wodifyId))
        .first()
      if (known) {
        await join(known._id)
        out.push({ wodifyId, userId: known._id })
        continue
      }
      const nameKey = norm(name)
      const sameName = (
        await ctx.db
          .query('users')
          .withIndex('by_nameKey', (q) => q.eq('nameKey', nameKey))
          .take(2)
      ).filter((u) => !u.wodifyId)
      if (sameName.length === 1) {
        await ctx.db.patch(sameName[0]._id, { wodifyId })
        await join(sameName[0]._id)
        out.push({ wodifyId, userId: sameName[0]._id })
        continue
      }
      const userId = await ctx.db.insert('users', { name, nameKey, wodifyId, role: 'athlete' })
      await join(userId)
      out.push({ wodifyId, userId })
      created++
    }
    return { users: out, created }
  },
})

const sectionFor = (
  key: string,
  sectionId: Id<'sections'>,
  c: { name: string; description: string },
  scoreTypeId: Id<'scoreTypes'>,
): ProgramSection => ({
  key,
  sectionId,
  notes: stripHtml(c.description) || undefined,
  score: { scoreTypeId, title: c.name.trim() },
  exercises: [],
})

// One workout per class + date. Imported days are rebuilt from the file; coach-made days only
// gain the components they're missing.
export const upsertWorkouts = mutation({
  args: {
    classId: v.id('classes'),
    days: v.array(
      v.object({
        date: v.string(),
        title: v.string(),
        components: v.array(
          v.object({ name: v.string(), description: v.string(), scoreType: v.string() }),
        ),
      }),
    ),
  },
  handler: async (ctx, { classId, days }) => {
    await requireRole(ctx, 'admin')
    limit(days.length, MAX.days, 'days')
    if (!(await ctx.db.get(classId))) throw new ConvexError('Class not found')
    const section = await ctx.db
      .query('sections')
      .withIndex('by_title', (q) => q.eq('title', SECTION))
      .first()
    if (!section) throw new ConvexError('Metcon section is missing: start the import again')
    const scoreTypeId = await scoreTypeIds(ctx)
    const out: { date: string; workoutId: Id<'workouts'> }[] = []
    let created = 0
    let updated = 0
    for (const day of days) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) throw new ConvexError(`Bad date "${day.date}"`)
      const sections: ProgramSection[] = []
      for (const c of day.components) {
        if (!isScoreTypeName(c.scoreType)) throw new ConvexError(`Unknown score type "${c.scoreType}"`)
        sections.push(sectionFor(itemKey(c.name), section._id, c, await scoreTypeId(c.scoreType)))
      }
      const existing = await ctx.db
        .query('workouts')
        .withIndex('by_class_date', (q) => q.eq('classId', classId).eq('date', day.date))
        .first()
      if (!existing) {
        if (sections.length > MAX.sections) throw new ConvexError(`Too many components on ${day.date}`)
        const workoutId = await ctx.db.insert('workouts', {
          classId,
          date: day.date,
          title: day.title.trim().slice(0, 120) || SECTION,
          program: sections,
          source: 'wodify',
        })
        out.push({ date: day.date, workoutId })
        created++
        continue
      }
      const incoming = new Map(sections.map((s) => [s.key, s]))
      const program =
        existing.source === 'wodify'
          ? [
              ...existing.program.map((s) => incoming.get(s.key) ?? s),
              ...sections.filter((s) => !existing.program.some((e) => e.key === s.key)),
            ]
          : [...existing.program, ...sections.filter((s) => !existing.program.some((e) => e.key === s.key))]
      if (program.length > MAX.sections) throw new ConvexError(`Too many components on ${day.date}`)
      if (JSON.stringify(program) !== JSON.stringify(existing.program)) {
        await ctx.db.patch(existing._id, { program })
        updated++
      }
      out.push({ date: day.date, workoutId: existing._id })
    }
    return { workouts: out, created, updated }
  },
})

// One memberLog per athlete per scored component. Sets are parsed here from the raw result text.
// Logs made in the app (no `source`) are never overwritten.
export const upsertLogs = mutation({
  args: {
    logs: v.array(
      v.object({
        userId: v.id('users'),
        workoutId: v.id('workouts'),
        itemKey: v.string(),
        isRx: v.boolean(),
        notes: v.optional(v.string()),
        results: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, { logs }) => {
    await requireRole(ctx, 'admin')
    limit(logs.length, MAX.logs, 'results')
    const workouts = new Map<Id<'workouts'>, Doc<'workouts'> | null>()
    let created = 0
    let updated = 0
    let skipped = 0
    for (const l of logs) {
      if (!workouts.has(l.workoutId)) workouts.set(l.workoutId, await ctx.db.get(l.workoutId))
      const workout = workouts.get(l.workoutId)
      const item = workout?.program.find((s) => s.key === l.itemKey)
      const { sets, unit } = parseResults(l.results)
      if (!workout || !item?.score || !sets.length || !(await ctx.db.get(l.userId))) {
        skipped++
        continue
      }
      const fields = {
        scoreTypeId: item.score.scoreTypeId,
        unit,
        isRx: l.isRx,
        notes: l.notes?.trim().slice(0, 2000) || undefined,
        sortValue: sortMetric(sets),
        sets,
      }
      const existing = (
        await ctx.db
          .query('memberLogs')
          .withIndex('by_user_workout', (q) => q.eq('userId', l.userId).eq('workoutId', workout._id))
          .take(50)
      ).find((m) => m.itemKey === l.itemKey)
      if (existing) {
        if (existing.source !== 'wodify') {
          skipped++
          continue
        }
        const before = [existing.scoreTypeId, existing.unit, existing.isRx, existing.notes, existing.sortValue, existing.sets]
        const after = [fields.scoreTypeId, fields.unit, fields.isRx, fields.notes, fields.sortValue, fields.sets]
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          await ctx.db.patch(existing._id, fields)
          updated++
        }
        continue
      }
      await ctx.db.insert('memberLogs', {
        userId: l.userId,
        workoutId: workout._id,
        itemKey: l.itemKey,
        loggedAt: Date.parse(`${workout.date}T12:00:00Z`),
        isScored: true,
        source: 'wodify',
        ...fields,
      })
      created++
    }
    return { created, updated, skipped }
  },
})

// Undo / dev reset: deletes this class's imported workouts and imported logs, a page at a time.
// A workout that also has logs made in the app keeps its row (only imported logs go).
export const removeImported = mutation({
  args: { classId: v.id('classes'), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { classId, paginationOpts }) => {
    await requireRole(ctx, 'admin')
    const page = await ctx.db
      .query('workouts')
      .withIndex('by_class_date', (q) => q.eq('classId', classId))
      .paginate({ ...paginationOpts, numItems: Math.min(paginationOpts.numItems, 25) })
    let workouts = 0
    let logs = 0
    for (const w of page.page) {
      const all = await ctx.db
        .query('memberLogs')
        .withIndex('by_workout_item_score', (q) => q.eq('workoutId', w._id))
        .take(1000)
      for (const m of all) {
        if (m.source !== 'wodify') continue
        await ctx.db.delete(m._id)
        logs++
      }
      if (w.source === 'wodify' && all.length < 1000 && all.every((m) => m.source === 'wodify')) {
        await ctx.db.delete(w._id)
        workouts++
      }
    }
    return { isDone: page.isDone, cursor: page.continueCursor, workouts, logs }
  },
})

// Classes to import into (a gym's programming is shared by all its class times).
export const classOptions = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, 'admin')
    const classes = await ctx.db.query('classes').take(200)
    return classes.map((c) => ({ _id: c._id, name: c.name, startTime: c.startTime }))
  },
})

// Imported athletes nobody has signed in as yet.
export const unclaimed = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, 'admin')
    const users = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', undefined))
      .take(500)
    return users.map((u) => ({ _id: u._id, name: u.name }))
  },
})

// Manual fix when a name didn't match: move an unclaimed athlete's logs onto a real user, then
// delete the placeholder. Call until done (moves up to 200 logs per call).
export const mergeImportedUser = mutation({
  args: { importedUserId: v.id('users'), userId: v.id('users') },
  handler: async (ctx, { importedUserId, userId }) => {
    await requireRole(ctx, 'admin')
    const from = await ctx.db.get(importedUserId)
    const to = await ctx.db.get(userId)
    if (!from || !to) throw new ConvexError('User not found')
    if (from.tokenIdentifier) throw new ConvexError('That athlete has already signed in')
    if (from._id === to._id) throw new ConvexError('Pick a different user')
    const logs = await ctx.db
      .query('memberLogs')
      .withIndex('by_user_workout', (q) => q.eq('userId', importedUserId))
      .take(200)
    for (const l of logs) {
      const clash = (
        await ctx.db
          .query('memberLogs')
          .withIndex('by_user_workout', (q) => q.eq('userId', userId).eq('workoutId', l.workoutId))
          .take(50)
      ).some((m) => m.itemKey === l.itemKey)
      if (clash) await ctx.db.delete(l._id)
      else await ctx.db.patch(l._id, { userId })
    }
    if (logs.length === 200) return { done: false }
    if (from.wodifyId && !to.wodifyId) await ctx.db.patch(to._id, { wodifyId: from.wodifyId })
    await ctx.db.delete(from._id)
    return { done: true }
  },
})
