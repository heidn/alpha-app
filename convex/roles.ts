import { v, type Infer } from 'convex/values'
import type { Doc } from './_generated/dataModel'

// Dependency-free: imported by schema.ts and the client.
export const ROLES = ['admin', 'coach', 'athlete'] as const
export const roleValidator = v.union(v.literal('admin'), v.literal('coach'), v.literal('athlete'))
export type Role = Infer<typeof roleValidator>

export function roleOf(user: Doc<'users'>): Role {
  return user.role ?? 'athlete'
}
