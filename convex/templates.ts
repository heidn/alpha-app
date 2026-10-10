import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { programSectionV } from './domain'
import { roleOf } from './roles'
import { requireRole } from './users'

const MAX_EXERCISES = 30

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, 'admin', 'coach')
    const rows = await ctx.db.query('sectionTemplates').withIndex('by_name').take(200)
    const exerciseIds = [
      ...new Set(rows.flatMap((t) => t.section.exercises.map((e) => e.exerciseId))),
    ]
    const [sections, exercises] = await Promise.all([
      Promise.all([...new Set(rows.map((t) => t.section.sectionId))].map((id) => ctx.db.get(id))),
      Promise.all(exerciseIds.map((id) => ctx.db.get(id))),
    ])
    const sectionTitle = new Map(sections.flatMap((s) => (s ? [[s._id, s.title] as const] : [])))
    const exerciseNames = Object.fromEntries(
      exercises.flatMap((e) => (e ? [[e._id, e.name] as const] : [])),
    )
    return rows.map((t) => ({
      _id: t._id,
      name: t.name,
      createdBy: t.createdBy,
      sectionTitle: sectionTitle.get(t.section.sectionId) ?? 'Section',
      section: t.section,
      exerciseNames,
    }))
  },
})

export const create = mutation({
  args: { name: v.string(), section: programSectionV },
  handler: async (ctx, { name, section }) => {
    const user = await requireRole(ctx, 'admin', 'coach')
    const trimmed = name.trim()
    if (!trimmed) throw new ConvexError('Template name is required')
    if (section.exercises.length > MAX_EXERCISES) throw new ConvexError('Too many exercises')
    if (!(await ctx.db.get(section.sectionId))) throw new ConvexError('Section not found')
    const ids = [...new Set(section.exercises.map((e) => e.exerciseId))]
    if ((await Promise.all(ids.map((id) => ctx.db.get(id)))).some((e) => !e)) {
      throw new ConvexError('Exercise not found')
    }
    const dupe = await ctx.db
      .query('sectionTemplates')
      .withIndex('by_name', (q) => q.eq('name', trimmed))
      .first()
    if (dupe) throw new ConvexError('A template with that name already exists')
    return await ctx.db.insert('sectionTemplates', { name: trimmed, section, createdBy: user._id })
  },
})

// Admins, or the coach who made it.
export const remove = mutation({
  args: { templateId: v.id('sectionTemplates') },
  handler: async (ctx, { templateId }) => {
    const user = await requireRole(ctx, 'admin', 'coach')
    const t = await ctx.db.get(templateId)
    if (!t) return
    if (roleOf(user) !== 'admin' && t.createdBy !== user._id) {
      throw new ConvexError('Only an admin or its creator can delete this template')
    }
    await ctx.db.delete(templateId)
  },
})
