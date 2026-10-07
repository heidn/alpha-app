import type { Doc } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import type { Role } from './roles'

// Dev-only fixtures. Fake tokenIdentifiers can never match a real Clerk login.
const TEST_USERS: { name: string; email: string; role: Role }[] = [
  { name: 'Casey Coach', email: 'coach1@test.local', role: 'coach' },
  { name: 'Avery Athlete', email: 'athlete1@test.local', role: 'athlete' },
  { name: 'Blake Athlete', email: 'athlete2@test.local', role: 'athlete' },
  { name: 'Jordan Athlete', email: 'athlete3@test.local', role: 'athlete' },
  { name: 'Riley Athlete', email: 'athlete4@test.local', role: 'athlete' },
  { name: 'Sam Athlete', email: 'athlete5@test.local', role: 'athlete' },
]

// `npx convex run seed:testUsers` (idempotent)
export const testUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0
    for (const u of TEST_USERS) {
      const tokenIdentifier = `test|${u.email}`
      const existing = await ctx.db
        .query('users')
        .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', tokenIdentifier))
        .unique()
      if (existing) continue
      await ctx.db.insert('users', { ...u, tokenIdentifier })
      inserted++
    }
    return { inserted }
  },
})

const SCORE_TYPES: Omit<Doc<'scoreTypes'>, '_id' | '_creationTime'>[] = [
  { name: 'Weight per set', fields: ['reps', 'weight'], perSet: true, sort: 'desc' },
  { name: 'For Time', fields: ['timeSeconds'], perSet: false, sort: 'asc' },
  { name: 'AMRAP', fields: ['rounds', 'reps'], perSet: false, sort: 'desc' },
  { name: 'Each Round', fields: ['timeSeconds'], perSet: true, sort: 'asc' },
  { name: 'Checkmark', fields: ['done'], perSet: false, sort: 'desc' },
  { name: 'Distance', fields: ['distance'], perSet: false, sort: 'desc' },
]

// `npx convex run seed:scoreTypes` (idempotent)
export const scoreTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0
    for (const s of SCORE_TYPES) {
      const existing = await ctx.db
        .query('scoreTypes')
        .withIndex('by_name', (q) => q.eq('name', s.name))
        .first()
      if (existing) continue
      await ctx.db.insert('scoreTypes', s)
      inserted++
    }
    return { inserted }
  },
})
