import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { roleValidator } from './roles'

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    tokenIdentifier: v.string(),
    // Absent = 'athlete'. Optional so existing rows stay valid.
    role: v.optional(roleValidator),
  }).index('by_tokenIdentifier', ['tokenIdentifier']),
})
