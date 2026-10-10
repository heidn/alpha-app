import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { internalMutation, mutation, type MutationCtx } from './_generated/server'
import { requireRole } from './users'

// "Hang Power Snatch + Snatch + Overhead Squat" → its lifts. Not a complex → [].
export function complexParts(name: string): string[] {
  const parts = name.split(/\s+\+\s+/).map((p) => p.trim())
  return parts.length > 1 && parts.every(Boolean) ? parts : []
}

const sameIds = (a: Id<'exercises'>[] | undefined, b: Id<'exercises'>[]) =>
  (a ?? []).length === b.length && b.every((id, i) => a?.[i] === id)

// Set `parts` from the exercise's name, creating missing part lifts ("Low Hang Snatch").
// Returns true when it changed anything.
export async function linkParts(ctx: MutationCtx, exerciseId: Id<'exercises'>) {
  const e = await ctx.db.get(exerciseId)
  if (!e) return false
  const ids: Id<'exercises'>[] = []
  for (const name of complexParts(e.name)) {
    const found = await ctx.db
      .query('exercises')
      .withIndex('by_name', (q) => q.eq('name', name))
      .first()
    ids.push(found?._id ?? (await ctx.db.insert('exercises', { name })))
  }
  if (sameIds(e.parts, ids)) return false
  await ctx.db.patch(exerciseId, { parts: ids.length ? ids : undefined })
  return true
}

const BATCH = 100

async function linkBatch(ctx: MutationCtx, cursor: string | null) {
  const page = await ctx.db.query('exercises').paginate({ cursor, numItems: BATCH })
  let linked = 0
  for (const e of page.page)
    if (complexParts(e.name).length && (await linkParts(ctx, e._id))) linked++
  return { done: page.isDone, cursor: page.continueCursor, linked }
}

// Admin, in batches: link every complex in the library to its parts.
export const linkAll = mutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    await requireRole(ctx, 'admin')
    return await linkBatch(ctx, cursor)
  },
})

export const linkAllInternal = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => await linkBatch(ctx, cursor),
})
