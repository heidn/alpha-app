import { ConvexError, v, type JSONValue } from 'convex/values'
import { mutation, query, type QueryCtx } from './_generated/server'
import { claimInvites, normalizeEmail } from './classMembers'
import { genderV } from './domain'
import { claimRoleInvite } from './invites'
import { roleOf, type Role } from './roles'
import { norm } from './wodify'

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

// Profile photos are Clerk-hosted; anything else is refused so the app never renders a
// user-supplied URL from another host (tracking pixels etc.).
const IMAGE_HOSTS = new Set(['img.clerk.com'])
function clerkImage(value: unknown) {
  if (typeof value !== 'string' || value.length > 2000) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && IMAGE_HOSTS.has(url.hostname) ? url.href : undefined
  } catch {
    return undefined
  }
}

export const current = query({
  args: {},
  handler: async (ctx) => getCurrentUser(ctx),
})

// Called by the client after sign-in; creates/refreshes the user from the Clerk JWT.
// imageUrl: the Clerk photo (null = no photo; omitted = leave as is). The token can't tell a real
// photo from Clerk's generated default, so the client sends it from `user.hasImage`.
export const store = mutation({
  args: { imageUrl: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    let existing = await getCurrentUser(ctx)
    // Names are user-owned once set (onboarding); Clerk claims only fill gaps.
    const firstName = existing?.firstName ?? claim(identity.first_name)
    const lastName = existing?.lastName ?? claim(identity.last_name)
    const fields = {
      name: [firstName, lastName].filter(Boolean).join(' ') || identity.name || identity.email || 'Member',
      email: identity.email && normalizeEmail(identity.email),
      firstName,
      lastName,
      tokenIdentifier: identity.tokenIdentifier,
    }
    const nameKey = norm(fields.name)
    const imageUrl =
      args.imageUrl === undefined ? existing?.imageUrl : (clerkImage(args.imageUrl) ?? undefined)
    if (!existing) {
      // Imported (Wodify) athletes wait unclaimed; take one over only when the name is unambiguous.
      // Admins fix mismatches with wodifyImport.mergeImportedUser.
      const sameName = await ctx.db
        .query('users')
        .withIndex('by_nameKey', (q) => q.eq('nameKey', nameKey))
        .take(10)
      const unclaimed = sameName.filter((u) => !u.tokenIdentifier)
      if (unclaimed.length === 1 && sameName.length === 1) {
        await ctx.db.patch(unclaimed[0]._id, { tokenIdentifier: fields.tokenIdentifier })
        existing = { ...unclaimed[0], tokenIdentifier: fields.tokenIdentifier }
      }
    }
    // New members are always athletes. Higher roles only come from an admin: a verified-email
    // role invite (claimed below), admin.setRole, or the grantAdmin CLI. Never from the client.
    const userId =
      existing?._id ??
      (await ctx.db.insert('users', { ...fields, nameKey, imageUrl, role: 'athlete' }))
    if (
      existing &&
      (existing.name !== fields.name ||
        existing.email !== fields.email ||
        existing.firstName !== firstName ||
        existing.lastName !== lastName ||
        existing.nameKey !== nameKey ||
        existing.imageUrl !== imageUrl)
    ) {
      await ctx.db.patch(existing._id, {
        name: fields.name,
        email: fields.email,
        firstName,
        lastName,
        nameKey,
        imageUrl,
      })
    }
    // Class invites wait for this email; claim them in the same transaction.
    if (fields.email) await claimInvites(ctx, userId, fields.email)
    // Roles are privileges: only claim for a verified email (needs `email_verified` in the session token).
    const verified = identity.emailVerified === true || identity.email_verified === 'true'
    if (fields.email && verified) await claimRoleInvite(ctx, userId, fields.email)
    return userId
  },
})

const MAX_NAME = 50

function cleanName(value: string, label: string) {
  const trimmed = value.trim()
  if (!trimmed) throw new ConvexError(`${label} is required.`)
  if (trimmed.length > MAX_NAME) throw new ConvexError(`${label} must be ${MAX_NAME} characters or fewer.`)
  return trimmed
}

// Onboarding: required profile fields the client collects after first sign-in.
export const completeProfile = mutation({
  args: { firstName: v.string(), lastName: v.string(), gender: genderV },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const next = {
      firstName: cleanName(args.firstName, 'First name'),
      lastName: cleanName(args.lastName, 'Last name'),
      gender: args.gender,
    }
    const name = `${next.firstName} ${next.lastName}`
    if (user.firstName === next.firstName && user.lastName === next.lastName && user.gender === next.gender) return
    await ctx.db.patch(user._id, { ...next, name })
  },
})
