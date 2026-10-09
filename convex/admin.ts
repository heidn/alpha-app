import { paginationOptsValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { roleOf, roleValidator } from './roles'
import { requireRole } from './users'

export const listUsers = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireRole(ctx, 'admin')
    const page = await ctx.db.query('users').order('desc').paginate(paginationOpts)
    return {
      ...page,
      page: page.page.map((u) => ({
        _id: u._id,
        _creationTime: u._creationTime,
        name: u.name,
        email: u.email,
        role: roleOf(u),
        imageUrl: u.imageUrl,
        signedIn: !!u.tokenIdentifier, // false = imported athlete, not claimed yet
      })),
    }
  },
})

export const setRole = mutation({
  args: { userId: v.id('users'), role: roleValidator },
  handler: async (ctx, { userId, role }) => {
    const admin = await requireRole(ctx, 'admin')
    // Prevent locking yourself out; another admin must demote you.
    if (userId === admin._id && role !== 'admin') throw new ConvexError('You cannot remove your own admin role')
    const target = await ctx.db.get(userId)
    if (!target) throw new ConvexError('User not found')
    await ctx.db.patch(userId, { role })
  },
})

// Bootstrap the first admin: `npx convex run admin:grantAdmin '{"userId":"<id>"}'`
export const grantAdmin = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    if (!(await ctx.db.get(userId))) throw new ConvexError('User not found')
    await ctx.db.patch(userId, { role: 'admin' })
  },
})
