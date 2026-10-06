import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    // Clerk user id (identity.subject); tokenIdentifier = `${issuer}|${clerkId}`
    clerkId: v.string(),
    tokenIdentifier: v.string(),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_clerkId', ['clerkId']),
})
