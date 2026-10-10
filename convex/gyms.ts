import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type QueryCtx } from './_generated/server'
import { requireGymStaff } from './access'
import { roleOf } from './roles'
import { requireRole } from './users'

const gymFields = { name: v.string(), address: v.string(), isOnline: v.boolean() }

const project = (g: Doc<'gyms'>) => ({
  _id: g._id,
  name: g.name,
  address: g.address,
  isOnline: g.isOnline,
})

function clean(args: { name: string; address: string; isOnline: boolean }) {
  const name = args.name.trim()
  if (!name) throw new ConvexError('Gym name is required')
  return { name, address: args.address.trim(), isOnline: args.isOnline }
}

// Admin: every gym. Coach: gyms where they're staff.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, 'admin', 'coach')
    if (roleOf(user) === 'admin') {
      const gyms = await ctx.db.query('gyms').withIndex('by_name').take(200)
      return gyms.map(project)
    }
    const rows = await ctx.db
      .query('gymMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .take(100)
    const gyms = await Promise.all(rows.filter((r) => r.staff).map((r) => ctx.db.get(r.gymId)))
    return gyms
      .filter((g) => g !== null)
      .map(project)
      .sort((a, b) => a.name.localeCompare(b.name))
  },
})

// Takes a raw string so a bad URL id yields null instead of a validation error.
export const get = query({
  args: { gymId: v.string() },
  handler: async (ctx, args) => {
    const gymId = ctx.db.normalizeId('gyms', args.gymId)
    const gym = gymId && (await ctx.db.get(gymId))
    if (!gym) return null
    await requireGymStaff(ctx, gym._id)
    return project(gym)
  },
})

export const create = mutation({
  args: gymFields,
  handler: async (ctx, args) => {
    await requireRole(ctx, 'admin')
    return await ctx.db.insert('gyms', clean(args))
  },
})

export const update = mutation({
  args: { gymId: v.id('gyms'), ...gymFields },
  handler: async (ctx, { gymId, ...args }) => {
    await requireRole(ctx, 'admin')
    const gym = await ctx.db.get(gymId)
    if (!gym) throw new ConvexError('Gym not found')
    const next = clean(args)
    if (gym.name === next.name && gym.address === next.address && gym.isOnline === next.isOnline)
      return
    await ctx.db.patch(gymId, next)
  },
})

async function userSummary(ctx: QueryCtx, userId: Id<'users'>) {
  const u = await ctx.db.get(userId)
  return u && { _id: u._id, name: u.name, email: u.email, role: roleOf(u) }
}

export const staff = query({
  args: { gymId: v.id('gyms') },
  handler: async (ctx, { gymId }) => {
    await requireGymStaff(ctx, gymId)
    const rows = await ctx.db
      .query('gymMembers')
      .withIndex('by_gym_staff', (q) => q.eq('gymId', gymId).eq('staff', true))
      .take(100)
    const users = await Promise.all(rows.map((r) => userSummary(ctx, r.userId)))
    return users.filter((u) => u !== null).sort((a, b) => a.name.localeCompare(b.name))
  },
})

// Coaches and admins an admin can add as staff.
export const staffCandidates = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, 'admin')
    const [coaches, admins] = await Promise.all(
      (['coach', 'admin'] as const).map((role) =>
        ctx.db
          .query('users')
          .withIndex('by_role', (q) => q.eq('role', role))
          .take(200),
      ),
    )
    return [...coaches, ...admins]
      .map((u) => ({ _id: u._id, name: u.name, email: u.email, role: roleOf(u) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const addStaff = mutation({
  args: { gymId: v.id('gyms'), userId: v.id('users') },
  handler: async (ctx, { gymId, userId }) => {
    await requireRole(ctx, 'admin')
    const [gym, user] = await Promise.all([ctx.db.get(gymId), ctx.db.get(userId)])
    if (!gym) throw new ConvexError('Gym not found')
    if (!user) throw new ConvexError('User not found')
    if (roleOf(user) === 'athlete') throw new ConvexError('Make this user a Coach first')
    const existing = await ctx.db
      .query('gymMembers')
      .withIndex('by_gym_user', (q) => q.eq('gymId', gymId).eq('userId', userId))
      .unique()
    if (!existing) await ctx.db.insert('gymMembers', { gymId, userId, staff: true })
    else if (!existing.staff) await ctx.db.patch(existing._id, { staff: true })
  },
})

export const removeStaff = mutation({
  args: { gymId: v.id('gyms'), userId: v.id('users') },
  handler: async (ctx, { gymId, userId }) => {
    await requireRole(ctx, 'admin')
    const coached = await ctx.db
      .query('classes')
      .withIndex('by_coach', (q) => q.eq('coachId', userId))
      .take(100)
    if (coached.some((c) => c.gymId === gymId)) {
      throw new ConvexError('Reassign this coach’s classes first')
    }
    const row = await ctx.db
      .query('gymMembers')
      .withIndex('by_gym_user', (q) => q.eq('gymId', gymId).eq('userId', userId))
      .unique()
    if (!row?.staff) return
    const inClass = await ctx.db
      .query('classMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .take(100)
    if (inClass.some((m) => m.gymId === gymId)) await ctx.db.patch(row._id, { staff: undefined })
    else await ctx.db.delete(row._id)
  },
})
