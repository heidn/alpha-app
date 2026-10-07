import type { Doc } from './_generated/dataModel'
import { internalMutation } from './_generated/server'
import type { Role } from './roles'

// Dev-only fixtures. Fake tokenIdentifiers can never match a real Clerk login.
const TEST_USERS: { name: string; email: string; role: Role }[] = [
  { name: 'Ada Admin', email: 'admin1@test.local', role: 'admin' },
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
  { name: 'Weight per set', fields: ['reps', 'weight'], perSet: true, sort: 'desc', kind: 'lift' },
  { name: 'For Time', fields: ['timeSeconds'], perSet: false, sort: 'asc', kind: 'forTime' },
  { name: 'AMRAP', fields: ['rounds', 'reps'], perSet: false, sort: 'desc', kind: 'amrap' },
  { name: 'Each Round', fields: ['timeSeconds'], perSet: true, sort: 'asc', kind: 'other' },
  { name: 'Checkmark', fields: ['done'], perSet: false, sort: 'desc', kind: 'emom' },
  { name: 'Distance', fields: ['distance'], perSet: false, sort: 'desc', kind: 'other' },
  { name: 'Max load', fields: ['weight'], perSet: false, sort: 'desc', kind: 'maxLoad' },
]

// `npx convex run seed:scoreTypes` (idempotent; also backfills `kind` on existing rows)
export const scoreTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0
    let backfilled = 0
    for (const s of SCORE_TYPES) {
      const existing = await ctx.db
        .query('scoreTypes')
        .withIndex('by_name', (q) => q.eq('name', s.name))
        .first()
      if (!existing) {
        await ctx.db.insert('scoreTypes', s)
        inserted++
      } else if (existing.kind === undefined && s.kind !== undefined) {
        await ctx.db.patch(existing._id, { kind: s.kind })
        backfilled++
      }
    }
    return { inserted, backfilled }
  },
})
