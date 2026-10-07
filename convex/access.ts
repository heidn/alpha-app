import { ConvexError } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { roleOf } from './roles'
import { requireRole } from './users'

// Admin, or a coach who is staff at the gym.
export async function isGymStaff(ctx: QueryCtx, user: Doc<'users'>, gymId: Id<'gyms'>) {
  const role = roleOf(user)
  if (role === 'admin') return true
  if (role !== 'coach') return false
  const member = await ctx.db
    .query('gymMembers')
    .withIndex('by_gym_user', (q) => q.eq('gymId', gymId).eq('userId', user._id))
    .unique()
  return member?.staff === true
}

export async function requireGymStaff(ctx: QueryCtx, gymId: Id<'gyms'>) {
  const user = await requireRole(ctx, 'admin', 'coach')
  if (!(await isGymStaff(ctx, user, gymId))) throw new ConvexError('Forbidden')
  return user
}

export async function requireClassStaff(ctx: QueryCtx, classId: Id<'classes'>) {
  const cls = await ctx.db.get(classId)
  if (!cls) throw new ConvexError('Class not found')
  const user = await requireGymStaff(ctx, cls.gymId)
  return { user, cls }
}

export async function requireWorkoutStaff(ctx: QueryCtx, workoutId: Id<'workouts'>) {
  const workout = await ctx.db.get(workoutId)
  if (!workout) throw new ConvexError('Workout not found')
  const { user, cls } = await requireClassStaff(ctx, workout.classId)
  return { user, cls, workout }
}
