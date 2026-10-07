import { ConvexError, type JSONValue } from 'convex/values'
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

// Custom session-token claims render empty/null when unset on the Clerk user.
function claim(value: JSONValue | undefined) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
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
    const firstName = claim(identity.first_name)
    const lastName = claim(identity.last_name)
    const fields = {
      name: [firstName, lastName].filter(Boolean).join(' ') || identity.name || identity.email || 'Member',
      email: identity.email && normalizeEmail(identity.email),
      firstName,
      lastName,
      tokenIdentifier: identity.tokenIdentifier,
    }
    const existing = await getCurrentUser(ctx)
    const userId = existing?._id ?? (await ctx.db.insert('users', fields))
    if (
      existing &&
      (existing.name !== fields.name ||
        existing.email !== fields.email ||
        existing.firstName !== firstName ||
        existing.lastName !== lastName)
    ) {
      await ctx.db.patch(existing._id, { name: fields.name, email: fields.email, firstName, lastName })
    }
    // Class invites wait for this email; claim them in the same transaction.
    if (fields.email) await claimInvites(ctx, userId, fields.email)
    // Roles are privileges: only claim for a verified email (needs `email_verified` in the session token).
    const verified = identity.emailVerified === true || identity.email_verified === 'true'
    if (fields.email && verified) await claimRoleInvite(ctx, userId, fields.email)
    return userId
  },
})
