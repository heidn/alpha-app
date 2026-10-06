import { mutation, query, type QueryCtx } from './_generated/server'

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
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
    }
    const existing = await getCurrentUser(ctx)
    if (!existing) return await ctx.db.insert('users', fields)
    if (existing.name !== fields.name || existing.email !== fields.email) {
      await ctx.db.patch(existing._id, { name: fields.name, email: fields.email })
    }
    return existing._id
  },
})
