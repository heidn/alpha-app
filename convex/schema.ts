import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import {
  distanceUnitV,
  genderV,
  memberSetV,
  programV,
  scoreFieldV,
  sortV,
  weightUnitV,
} from './domain'
import { roleValidator } from './roles'

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    tokenIdentifier: v.string(),
    // Absent = 'athlete'. Optional so existing rows stay valid.
    role: v.optional(roleValidator),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    // Decides which Rx weight/distance the member sees.
    gender: v.optional(genderV),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  gyms: defineTable({
    name: v.string(),
    address: v.string(),
    isOnline: v.boolean(),
  }).index('by_name', ['name']),

  gymMembers: defineTable({
    gymId: v.id('gyms'),
    userId: v.id('users'),
    // true = gym staff (coach powers here); absent = athlete via a class.
    staff: v.optional(v.boolean()),
  })
    .index('by_gym_user', ['gymId', 'userId'])
    .index('by_gym_staff', ['gymId', 'staff'])
    .index('by_user', ['userId']),

  // Recurring class, e.g. "6 AM" Mon–Fri. Members join once and see its daily workout.
  classes: defineTable({
    gymId: v.id('gyms'),
    coachId: v.id('users'),
    name: v.string(),
    startTime: v.string(), // "06:00", gym local time
    durationMin: v.optional(v.number()),
    daysOfWeek: v.array(v.number()), // 0 = Sun … 6 = Sat
  })
    .index('by_gym', ['gymId'])
    .index('by_coach', ['coachId']),

  classMembers: defineTable({
    classId: v.id('classes'),
    userId: v.id('users'),
    gymId: v.id('gyms'),
  })
    .index('by_class_user', ['classId', 'userId'])
    .index('by_user', ['userId']),

  // Invite for someone without an account; claimed in users.store on sign-in.
  classInvites: defineTable({
    classId: v.id('classes'),
    gymId: v.id('gyms'),
    email: v.string(), // lowercased
    invitedBy: v.id('users'),
  })
    .index('by_email', ['email'])
    .index('by_class_email', ['classId', 'email']),

  // Admin invite: Convex owns the role; Clerk only delivers the email. Claimed in users.store.
  userInvites: defineTable({
    email: v.string(), // lowercased
    role: roleValidator,
    invitedBy: v.id('users'),
    status: v.union(
      v.literal('sending'),
      v.literal('sent'),
      v.literal('hasAccount'), // already in Clerk; role applies on next sign-in
      v.literal('failed'),
    ),
    clerkInvitationId: v.optional(v.string()),
    error: v.optional(v.string()),
  }).index('by_email', ['email']),

  sections: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
  }).index('by_title', ['title']),

  exercises: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
  })
    .index('by_name', ['name'])
    .searchIndex('search_name', { searchField: 'name' }),

  scoreTypes: defineTable({
    name: v.string(),
    fields: v.array(scoreFieldV),
    perSet: v.boolean(), // true = one input row per set
    sort: sortV, // leaderboard order of memberLogs.sortValue
  }).index('by_name', ['name']),

  // One day of one class. Program is embedded: bounded, always read/written as a unit.
  workouts: defineTable({
    classId: v.id('classes'),
    date: v.string(), // "2026-10-02"
    title: v.string(),
    description: v.optional(v.string()),
    durationMin: v.optional(v.number()),
    program: programV,
  }).index('by_class_date', ['classId', 'date']),

  // One result per member per scored item. Hot writes, so kept apart from workouts.
  memberLogs: defineTable({
    userId: v.id('users'),
    workoutId: v.id('workouts'),
    itemKey: v.string(), // program section/exercise key
    exerciseId: v.optional(v.id('exercises')), // copied for history; absent = section score
    scoreTypeId: v.id('scoreTypes'),
    loggedAt: v.number(),
    unit: v.optional(v.union(weightUnitV, distanceUnitV)),
    isRx: v.optional(v.boolean()),
    isScored: v.boolean(), // "Do not score" = false
    notes: v.optional(v.string()),
    mediaUrl: v.optional(v.string()), // stored only; never fetched server-side
    sortValue: v.optional(v.number()),
    sets: v.array(memberSetV), // non-perSet score types use one set
  })
    .index('by_workout_item_score', ['workoutId', 'itemKey', 'sortValue'])
    .index('by_user_workout', ['userId', 'workoutId'])
    .index('by_user_exercise', ['userId', 'exerciseId']),
})
