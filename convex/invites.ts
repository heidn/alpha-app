import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from './_generated/server'
import { normalizeEmail } from './classMembers'
import { roleValidator } from './roles'
import { requireRole } from './users'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CLERK_API = 'https://api.clerk.com/v1'
// Convex runtime provides process.env; the convex tsconfig has no node types.
declare const process: { env: Record<string, string | undefined> }

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, 'admin')
    const invites = await ctx.db.query('userInvites').order('desc').take(200)
    return invites.map((i) => ({
      _id: i._id,
      email: i.email,
      role: i.role,
      status: i.status,
      error: i.error,
      invitedAt: i._creationTime,
    }))
  },
})

// Creates or updates the pending invite and queues the Clerk email in the same transaction.
export const invite = mutation({
  args: { email: v.string(), role: roleValidator },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, 'admin')
    const email = normalizeEmail(args.email)
    if (!EMAIL_RE.test(email)) throw new ConvexError('Enter a valid email')
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first()
    if (user) throw new ConvexError(`${email} is already a member. Change their role in the table.`)

    const existing = await ctx.db
      .query('userInvites')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique()
    if (existing?.status === 'sending') throw new ConvexError('Invite is still sending. Try again shortly.')
    const inviteId =
      existing?._id ??
      (await ctx.db.insert('userInvites', { email, role: args.role, invitedBy: admin._id, status: 'sending' }))
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role, invitedBy: admin._id, status: 'sending', error: undefined })
    }
    await ctx.scheduler.runAfter(0, internal.invites.send, { inviteId, revokeId: existing?.clerkInvitationId })
    return existing ? ('resent' as const) : ('invited' as const)
  },
})

export const resend = mutation({
  args: { inviteId: v.id('userInvites') },
  handler: async (ctx, { inviteId }) => {
    await requireRole(ctx, 'admin')
    const invite = await ctx.db.get(inviteId)
    if (!invite) throw new ConvexError('Invite not found')
    if (invite.status === 'sending') return
    await ctx.db.patch(inviteId, { status: 'sending', error: undefined })
    await ctx.scheduler.runAfter(0, internal.invites.send, { inviteId, revokeId: invite.clerkInvitationId })
  },
})

export const revoke = mutation({
  args: { inviteId: v.id('userInvites') },
  handler: async (ctx, { inviteId }) => {
    await requireRole(ctx, 'admin')
    const invite = await ctx.db.get(inviteId)
    if (!invite) return
    await ctx.db.delete(inviteId)
    if (invite.clerkInvitationId) {
      await ctx.scheduler.runAfter(0, internal.invites.revokeClerk, { clerkInvitationId: invite.clerkInvitationId })
    }
  },
})

// Called from users.store: applies a pending role for a verified email.
export async function claimRoleInvite(ctx: MutationCtx, userId: Id<'users'>, email: string) {
  const invite = await ctx.db
    .query('userInvites')
    .withIndex('by_email', (q) => q.eq('email', normalizeEmail(email)))
    .unique()
  if (!invite) return
  await ctx.db.patch(userId, { role: invite.role })
  await ctx.db.delete(invite._id)
  // They may have signed up without the link; kill the outstanding one (no-op if accepted).
  if (invite.clerkInvitationId) {
    await ctx.scheduler.runAfter(0, internal.invites.revokeClerk, { clerkInvitationId: invite.clerkInvitationId })
  }
}

export const get = internalQuery({
  args: { inviteId: v.id('userInvites') },
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.db.get(inviteId)
    return invite && { email: invite.email, status: invite.status }
  },
})

// Returns false if the invite was revoked/claimed meanwhile, so the caller can undo the Clerk side.
export const record = internalMutation({
  args: {
    inviteId: v.id('userInvites'),
    status: v.union(v.literal('sent'), v.literal('hasAccount'), v.literal('failed')),
    clerkInvitationId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { inviteId, ...fields }) => {
    const invite = await ctx.db.get(inviteId)
    if (!invite) return false
    await ctx.db.patch(inviteId, fields)
    return true
  },
})

type ClerkError = { errors?: { code?: string; message?: string; long_message?: string }[] }

async function clerkFetch(path: string, body?: unknown) {
  const key = process.env.CLERK_SECRET_KEY
  if (!key) throw new Error('CLERK_SECRET_KEY is not set on this Convex deployment')
  return fetch(`${CLERK_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export const send = internalAction({
  args: { inviteId: v.id('userInvites'), revokeId: v.optional(v.string()) },
  handler: async (ctx, { inviteId, revokeId }) => {
    if (revokeId) await revokeQuietly(revokeId)
    const invite = await ctx.runQuery(internal.invites.get, { inviteId })
    if (!invite || invite.status !== 'sending') return

    let result: { status: 'sent' | 'hasAccount' | 'failed'; clerkInvitationId?: string; error?: string }
    try {
      // No redirect_url: Clerk's Account Portal handles the ticket and verifies the email.
      const res = await clerkFetch('/invitations', { email_address: invite.email, notify: true, ignore_existing: true })
      if (res.ok) {
        result = { status: 'sent', clerkInvitationId: ((await res.json()) as { id: string }).id }
      } else {
        const err = ((await res.json().catch(() => ({}))) as ClerkError).errors?.[0]
        result =
          err?.code === 'form_identifier_exists'
            ? { status: 'hasAccount' }
            : { status: 'failed', error: res.status === 429 ? 'Clerk rate limit hit. Try again later.' : (err?.long_message ?? err?.message ?? `Clerk error ${res.status}`) }
      }
    } catch (e) {
      result = { status: 'failed', error: e instanceof Error ? e.message : 'Could not reach Clerk' }
    }

    const stillPending = await ctx.runMutation(internal.invites.record, { inviteId, ...result })
    if (!stillPending && result.clerkInvitationId) await revokeQuietly(result.clerkInvitationId)
  },
})

export const revokeClerk = internalAction({
  args: { clerkInvitationId: v.string() },
  handler: async (_ctx, { clerkInvitationId }) => revokeQuietly(clerkInvitationId),
})

// Best effort: already accepted/revoked/expired invitations return 4xx, which is fine.
async function revokeQuietly(id: string) {
  try {
    await clerkFetch(`/invitations/${encodeURIComponent(id)}/revoke`)
  } catch {
    // Missing key or network: nothing else to undo.
  }
}
