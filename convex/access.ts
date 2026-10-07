import { ConvexError } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { roleOf } from './roles'
import { requireRole } from './users'

// Admin, or a coach who belongs to the gym.
export async function requireGymStaff(ctx: QueryCtx, gymId: Id<'gyms'>) {
  const user = await requireRole(ctx, 'admin', 'coach')
  if (roleOf(user) === 'admin') return user
  const member = await ctx.db
    .query('gymMembers')
    .withIndex('by_gym_user', (q) => q.eq('gymId', gymId).eq('userId', user._id))
    .unique()
  if (!member) throw new ConvexError('Forbidden')
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
