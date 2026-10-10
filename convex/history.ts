import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { query, type QueryCtx } from './_generated/server'
import { isGymStaff } from './access'
import { requireUser } from './users'

const MAX_LOGS = 500

// Your own history, or an athlete's at a gym where you're staff (admins: anyone).
async function requireHistoryAccess(ctx: QueryCtx, userId: Id<'users'>) {
  const viewer = await requireUser(ctx)
  if (viewer._id === userId) return
  const gyms = await ctx.db
    .query('gymMembers')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .take(20)
  for (const g of gyms) if (await isGymStaff(ctx, viewer, g.gymId)) return
  if (viewer.role === 'admin') return
  throw new ConvexError('Forbidden')
}

// One athlete's results on one movement, grouped by variant (Row · 2,000 m vs 500 m) and score
// type: only results in the same group are comparable. Oldest first within a group.
export const exercise = query({
  args: { userId: v.id('users'), exerciseId: v.id('exercises') },
  handler: async (ctx, { userId, exerciseId }) => {
    await requireHistoryAccess(ctx, userId)
    const [athlete, exercise] = await Promise.all([ctx.db.get(userId), ctx.db.get(exerciseId)])
    if (!athlete || !exercise) throw new ConvexError('Not found')
    const logs = await ctx.db
      .query('memberLogs')
      .withIndex('by_user_exercise', (q) => q.eq('userId', userId).eq('exerciseId', exerciseId))
      .take(MAX_LOGS)

    const groups = new Map<string, Doc<'memberLogs'>[]>()
    for (const l of logs) {
      if (!l.isScored) continue
      const key = `${l.variant ?? ''}|${l.scoreTypeId}`
      groups.set(key, [...(groups.get(key) ?? []), l])
    }
    const typeIds = [...new Set(logs.map((l) => l.scoreTypeId))]
    const types = new Map(
      (await Promise.all(typeIds.map((id) => ctx.db.get(id)))).flatMap((t) =>
        t ? [[t._id, t] as const] : [],
      ),
    )
    const variants = [...groups.values()]
      .map((rows) => {
        const t = types.get(rows[0].scoreTypeId)
        return {
          variant: rows[0].variant ?? null,
          scoreType: t ? { name: t.name, fields: t.fields, sort: t.sort } : null,
          entries: rows
            .sort((a, b) => a.loggedAt - b.loggedAt)
            .map((l) => ({
              logId: l._id,
              workoutId: l.workoutId,
              loggedAt: l.loggedAt,
              isRx: l.isRx,
              unit: l.unit,
              sortValue: l.sortValue,
              sets: l.sets,
              notes: l.notes,
            })),
        }
      })
      .sort((a, b) => b.entries.length - a.entries.length)

    return {
      athlete: { name: athlete.name },
      exercise: { name: exercise.name },
      truncated: logs.length === MAX_LOGS,
      variants,
    }
  },
})
