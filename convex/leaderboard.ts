import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { query, type QueryCtx } from './_generated/server'
import { requireClassStaff } from './access'

const MAX_ENTRIES = 300

// Neighbouring workout days of a class, for prev/next navigation.
async function neighbours(ctx: QueryCtx, classId: Id<'classes'>, date: string) {
  const [prev, next] = await Promise.all([
    ctx.db
      .query('workouts')
      .withIndex('by_class_date', (q) => q.eq('classId', classId).lt('date', date))
      .order('desc')
      .first(),
    ctx.db
      .query('workouts')
      .withIndex('by_class_date', (q) => q.eq('classId', classId).gt('date', date))
      .first(),
  ])
  return { prev: prev?.date ?? null, next: next?.date ?? null }
}

type Item = {
  key: string
  title: string
  kind: 'section' | 'lift'
  scoreTypeId: Id<'scoreTypes'>
}

function scoredItems(workout: Doc<'workouts'>, exerciseNames: Map<Id<'exercises'>, string>): Item[] {
  return workout.program.flatMap((s) => [
    ...(s.score ? [{ key: s.key, title: s.score.title, kind: 'section' as const, scoreTypeId: s.score.scoreTypeId }] : []),
    ...s.exercises.flatMap((e) =>
      e.score
        ? [{ key: e.key, title: exerciseNames.get(e.exerciseId) ?? e.score.title, kind: 'lift' as const, scoreTypeId: e.score.scoreTypeId }]
        : [],
    ),
  ])
}

// One class day: every scored item with its results, best first. Staff only, so members who
// haven't signed up yet (imported, no account) are included and flagged.
// orLatestBefore: no workout on `date` → use the class's latest workout before it (opening view).
export const day = query({
  args: { classId: v.id('classes'), date: v.string(), orLatestBefore: v.optional(v.boolean()) },
  handler: async (ctx, { classId, date: asked, orLatestBefore }) => {
    await requireClassStaff(ctx, classId)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asked)) throw new ConvexError('Date must be YYYY-MM-DD')
    let workout = await ctx.db
      .query('workouts')
      .withIndex('by_class_date', (q) => q.eq('classId', classId).eq('date', asked))
      .first()
    if (!workout && orLatestBefore) {
      workout = await ctx.db
        .query('workouts')
        .withIndex('by_class_date', (q) => q.eq('classId', classId).lt('date', asked))
        .order('desc')
        .first()
    }
    const date = workout?.date ?? asked
    const nav = await neighbours(ctx, classId, date)
    if (!workout) return { ...nav, date, workout: null, items: [] }

    const exerciseIds = [...new Set(workout.program.flatMap((s) => s.exercises.map((e) => e.exerciseId)))]
    const exercises = await Promise.all(exerciseIds.map((id) => ctx.db.get(id)))
    const names = new Map(exercises.flatMap((e) => (e ? [[e._id, e.name] as const] : [])))
    const items = scoredItems(workout, names)

    const [logsByItem, scoreTypes] = await Promise.all([
      Promise.all(
        items.map((it) =>
          ctx.db
            .query('memberLogs')
            .withIndex('by_workout_item_score', (q) => q.eq('workoutId', workout._id).eq('itemKey', it.key))
            .take(MAX_ENTRIES),
        ),
      ),
      Promise.all([...new Set(items.map((it) => it.scoreTypeId))].map((id) => ctx.db.get(id))),
    ])
    const typeById = new Map(scoreTypes.flatMap((t) => (t ? [[t._id, t] as const] : [])))
    const userIds = [...new Set(logsByItem.flat().map((l) => l.userId))]
    const users = new Map(
      (await Promise.all(userIds.map((id) => ctx.db.get(id)))).flatMap((u) => (u ? [[u._id, u] as const] : [])),
    )

    return {
      ...nav,
      date,
      workout: { _id: workout._id, title: workout.title },
      items: items.map((it, i) => {
        const type = typeById.get(it.scoreTypeId)
        const sort = type?.sort ?? 'desc'
        const entries = logsByItem[i]
          .filter((l) => l.isScored && users.has(l.userId))
          .map((l) => {
            const u = users.get(l.userId)!
            return {
              logId: l._id,
              name: u.name,
              signedUp: !!u.tokenIdentifier,
              imageUrl: u.imageUrl,
              isRx: l.isRx,
              unit: l.unit,
              sortValue: l.sortValue,
              sets: l.sets,
            }
          })
          .sort((a, b) => {
            // Rx above scaled (metcons only: lifts have no Rx), then the score, unscored last.
            if (it.kind === 'section' && !!a.isRx !== !!b.isRx) return a.isRx ? -1 : 1
            if (a.sortValue === undefined || b.sortValue === undefined)
              return a.sortValue === undefined ? (b.sortValue === undefined ? 0 : 1) : -1
            return sort === 'asc' ? a.sortValue - b.sortValue : b.sortValue - a.sortValue
          })
        return {
          key: it.key,
          title: it.title,
          kind: it.kind,
          scoreType: type ? { name: type.name, fields: type.fields, perSet: type.perSet } : null,
          truncated: logsByItem[i].length === MAX_ENTRIES,
          entries,
        }
      }),
    }
  },
})
