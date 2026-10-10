import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'

// Saved sections. Created from a workout ("Save as template"), inserted via "Add a section…".
export function TemplatesPanel() {
  const templates = useQuery(api.templates.list)
  const remove = useMutation(api.templates.remove)
  const { run, pending, error, clearError } = useRun()

  const onDelete = async (templateId: Id<'sectionTemplates'>, name: string) => {
    const ok = window.confirm(`Delete template “${name}”? Workouts that used it keep their copy.`)
    if (!ok) return
    await run(() => remove({ templateId }))
  }

  return (
    <section className={ui.card}>
      <ErrorBanner error={error} onDismiss={clearError} />
      {templates === undefined ? (
        <p className={ui.empty}>Loading…</p>
      ) : templates.length === 0 ? (
        <p className={ui.empty}>
          No templates yet. On any workout, use “Save as template” on a section to reuse it.
        </p>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <tbody>
              {templates.map((t) => (
                <tr key={t._id}>
                  <td>
                    <div>{t.name}</div>
                    <div className={ui.muted}>
                      {t.sectionTitle}
                      {t.section.exercises.length
                        ? ` · ${t.section.exercises
                            .map((e) => t.exerciseNames[e.exerciseId] ?? 'Exercise')
                            .join(', ')}`
                        : t.section.notes
                          ? ` · ${t.section.notes.split('\n')[0]}`
                          : ''}
                    </div>
                  </td>
                  <td className={ui.actions}>
                    <button
                      type="button"
                      className={`${ui.btnDanger} ${ui.btnSmall}`}
                      disabled={pending}
                      onClick={() => void onDelete(t._id, t.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
