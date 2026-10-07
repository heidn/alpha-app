import { ConvexError } from 'convex/values'
import { mutation, query, type QueryCtx } from './_generated/server'
import { claimInvites, normalizeEmail } from './classMembers'
import { claimRoleInvite } from './invites'
import { roleOf, type Role } from './roles'

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return await ctx.db
    .query('users')
    .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
    .unique()
}

export async function requireUser(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx)
  if (!user) throw new Error('Unauthenticated')
  return user
}

export async function requireRole(ctx: QueryCtx, ...allowed: Role[]) {
  const user = await requireUser(ctx)
  if (!allowed.includes(roleOf(user))) throw new ConvexError('Forbidden')
  return user
}

export const current = query({
  args: {},
  handler: async (ctx) => getCurrentUser(ctx),
})

// Called by the client after sign-in; creates/refreshes the user from the Clerk JWT.
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    const fields = {
      name: identity.name ?? identity.givenName ?? identity.nickname ?? identity.email ?? 'Member',
      email: identity.email && normalizeEmail(identity.email),
      tokenIdentifier: identity.tokenIdentifier,
    }
    const existing = await getCurrentUser(ctx)
    const userId = existing?._id ?? (await ctx.db.insert('users', fields))
    if (existing && (existing.name !== fields.name || existing.email !== fields.email)) {
      await ctx.db.patch(existing._id, { name: fields.name, email: fields.email })
    }
    // Class invites wait for this email; claim them in the same transaction.
    if (fields.email) await claimInvites(ctx, userId, fields.email)
    // Roles are privileges: only claim for a verified email (needs `email_verified` in the session token).
    if (fields.email && identity.emailVerified === true) await claimRoleInvite(ctx, userId, fields.email)
    return userId
  },
})
