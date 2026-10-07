import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type QueryCtx } from './_generated/server'
import { requireClassStaff, requireGymStaff } from './access'
import { roleOf } from './roles'

const classFields = {
  coachId: v.id('users'),
  name: v.string(),
  startTime: v.string(),
  durationMin: v.optional(v.number()),
  daysOfWeek: v.array(v.number()),
}

type ClassFields = {
  coachId: Id<'users'>
  name: string
  startTime: string
  durationMin?: number
  daysOfWeek: number[]
}

async function clean(ctx: QueryCtx, gymId: Id<'gyms'>, args: ClassFields) {
  const name = args.name.trim()
  if (!name) throw new ConvexError('Class name is required')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(args.startTime))
    throw new ConvexError('Start time must be HH:MM')
  if (args.durationMin !== undefined && !(args.durationMin > 0 && args.durationMin <= 600)) {
    throw new ConvexError('Duration must be 1–600 minutes')
  }
  const days = [...new Set(args.daysOfWeek)].sort((a, b) => a - b)
  if (days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new ConvexError('Pick at least one day')
  }
  const [coach, staffRow] = await Promise.all([
    ctx.db.get(args.coachId),
    ctx.db
      .query('gymMembers')
      .withIndex('by_gym_user', (q) => q.eq('gymId', gymId).eq('userId', args.coachId))
      .unique(),
  ])
  if (!coach || roleOf(coach) === 'athlete' || !staffRow?.staff) {
    throw new ConvexError('Coach must be staff at this gym')
  }
  return { ...args, name, daysOfWeek: days }
}

async function project(ctx: QueryCtx, c: Doc<'classes'>) {
  const coach = await ctx.db.get(c.coachId)
  return {
    _id: c._id,
    gymId: c.gymId,
    coachId: c.coachId,
    coachName: coach?.name ?? 'Unknown',
    name: c.name,
    startTime: c.startTime,
    durationMin: c.durationMin,
    daysOfWeek: c.daysOfWeek,
  }
}

export const listByGym = query({
  args: { gymId: v.id('gyms') },
  handler: async (ctx, { gymId }) => {
    await requireGymStaff(ctx, gymId)
    const classes = await ctx.db
      .query('classes')
      .withIndex('by_gym', (q) => q.eq('gymId', gymId))
      .take(100)
    const rows = await Promise.all(classes.map((c) => project(ctx, c)))
    return rows.sort((a, b) => a.startTime.localeCompare(b.startTime))
  },
})

// Raw string id so a bad URL yields null.
export const get = query({
  args: { classId: v.string() },
  handler: async (ctx, args) => {
    const classId = ctx.db.normalizeId('classes', args.classId)
    if (!classId || !(await ctx.db.get(classId))) return null
    const { cls } = await requireClassStaff(ctx, classId)
    const gym = await ctx.db.get(cls.gymId)
    return { ...(await project(ctx, cls)), gymName: gym?.name ?? '' }
  },
})

export const create = mutation({
  args: { gymId: v.id('gyms'), ...classFields },
  handler: async (ctx, { gymId, ...args }) => {
    await requireGymStaff(ctx, gymId)
    return await ctx.db.insert('classes', { gymId, ...(await clean(ctx, gymId, args)) })
  },
})

export const update = mutation({
  args: { classId: v.id('classes'), ...classFields },
  handler: async (ctx, { classId, ...args }) => {
    const { cls } = await requireClassStaff(ctx, classId)
    const next = await clean(ctx, cls.gymId, args)
    const same =
      cls.coachId === next.coachId &&
      cls.name === next.name &&
      cls.startTime === next.startTime &&
      cls.durationMin === next.durationMin &&
      cls.daysOfWeek.join() === next.daysOfWeek.join()
    // Explicit key so a removed duration (undefined) clears the field.
    if (!same) await ctx.db.patch(classId, { ...next, durationMin: next.durationMin })
  },
})

export const remove = mutation({
  args: { classId: v.id('classes') },
  handler: async (ctx, { classId }) => {
    await requireClassStaff(ctx, classId)
    const [workout, member] = await Promise.all([
      ctx.db
        .query('workouts')
        .withIndex('by_class_date', (q) => q.eq('classId', classId))
        .first(),
      ctx.db
        .query('classMembers')
        .withIndex('by_class_user', (q) => q.eq('classId', classId))
        .first(),
    ])
    if (workout) throw new ConvexError('This class has workouts and can’t be deleted')
    if (member) throw new ConvexError('Remove the class’s athletes first')
    const invites = await ctx.db
      .query('classInvites')
      .withIndex('by_class_email', (q) => q.eq('classId', classId))
      .take(500)
    await Promise.all(invites.map((i) => ctx.db.delete(i._id)))
    await ctx.db.delete(classId)
  },
})
