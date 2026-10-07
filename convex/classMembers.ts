import { paginationOptsValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx } from './_generated/server'
import { requireClassStaff } from './access'
import { roleOf } from './roles'

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

// Joins a user to a class (idempotent) and ensures their gym membership.
export async function addToClass(ctx: MutationCtx, cls: Doc<'classes'>, userId: Id<'users'>) {
  const [member, gymMember] = await Promise.all([
    ctx.db
      .query('classMembers')
      .withIndex('by_class_user', (q) => q.eq('classId', cls._id).eq('userId', userId))
      .unique(),
    ctx.db
      .query('gymMembers')
      .withIndex('by_gym_user', (q) => q.eq('gymId', cls.gymId).eq('userId', userId))
      .unique(),
  ])
  if (!member) await ctx.db.insert('classMembers', { classId: cls._id, userId, gymId: cls.gymId })
  if (!gymMember) await ctx.db.insert('gymMembers', { gymId: cls.gymId, userId })
}

// Called from users.store: turns pending invites for this email into memberships.
export async function claimInvites(ctx: MutationCtx, userId: Id<'users'>, email: string) {
  const invites = await ctx.db
    .query('classInvites')
    .withIndex('by_email', (q) => q.eq('email', normalizeEmail(email)))
    .take(50)
  for (const invite of invites) {
    const cls = await ctx.db.get(invite.classId)
    if (cls) await addToClass(ctx, cls, userId)
    await ctx.db.delete(invite._id)
  }
}

export const roster = query({
  args: { classId: v.id('classes'), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { classId, paginationOpts }) => {
    await requireClassStaff(ctx, classId)
    const page = await ctx.db
      .query('classMembers')
      .withIndex('by_class_user', (q) => q.eq('classId', classId))
      .paginate(paginationOpts)
    const users = await Promise.all(page.page.map((m) => ctx.db.get(m.userId)))
    return {
      ...page,
      page: users
        .filter((u) => u !== null)
        .map((u) => ({ _id: u._id, name: u.name, email: u.email, role: roleOf(u) })),
    }
  },
})

export const listInvites = query({
  args: { classId: v.id('classes') },
  handler: async (ctx, { classId }) => {
    await requireClassStaff(ctx, classId)
    const invites = await ctx.db
      .query('classInvites')
      .withIndex('by_class_email', (q) => q.eq('classId', classId))
      .take(200)
    return invites.map((i) => ({ _id: i._id, email: i.email, invitedAt: i._creationTime }))
  },
})

// One-time invite: existing users join now; others join when they sign up with this email.
export const invite = mutation({
  args: { classId: v.id('classes'), email: v.string() },
  handler: async (ctx, args) => {
    const { user, cls } = await requireClassStaff(ctx, args.classId)
    const email = normalizeEmail(args.email)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError('Enter a valid email')
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first()
    if (existing) {
      await addToClass(ctx, cls, existing._id)
      return 'added' as const
    }
    const pending = await ctx.db
      .query('classInvites')
      .withIndex('by_class_email', (q) => q.eq('classId', cls._id).eq('email', email))
      .first()
    if (!pending) {
      await ctx.db.insert('classInvites', {
        classId: cls._id,
        gymId: cls.gymId,
        email,
        invitedBy: user._id,
      })
    }
    return 'invited' as const
  },
})

export const cancelInvite = mutation({
  args: { inviteId: v.id('classInvites') },
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.db.get(inviteId)
    if (!invite) return
    await requireClassStaff(ctx, invite.classId)
    await ctx.db.delete(inviteId)
  },
})

export const remove = mutation({
  args: { classId: v.id('classes'), userId: v.id('users') },
  handler: async (ctx, { classId, userId }) => {
    const { cls } = await requireClassStaff(ctx, classId)
    const member = await ctx.db
      .query('classMembers')
      .withIndex('by_class_user', (q) => q.eq('classId', classId).eq('userId', userId))
      .unique()
    if (!member) return
    await ctx.db.delete(member._id)
    // Drop the gym membership too unless they're staff or still in another class there.
    const [gymMember, others] = await Promise.all([
      ctx.db
        .query('gymMembers')
        .withIndex('by_gym_user', (q) => q.eq('gymId', cls.gymId).eq('userId', userId))
        .unique(),
      ctx.db
        .query('classMembers')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .take(100),
    ])
    if (gymMember && !gymMember.staff && !others.some((m) => m.gymId === cls.gymId)) {
      await ctx.db.delete(gymMember._id)
    }
  },
})
