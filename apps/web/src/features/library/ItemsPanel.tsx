import { useState, type FormEvent, type ReactNode } from 'react'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'

export type Item<I extends string> = { _id: I; name: string; description?: string }
type Values = { name: string; description?: string }

type Props<I extends string> = {
  noun: string // "section", "exercise"
  items: Item<I>[] | undefined
  canEdit: boolean
  search?: { value: string; onChange: (v: string) => void }
  onCreate: (values: Values) => Promise<unknown>
  onUpdate: (id: I, values: Values) => Promise<unknown>
  actions?: (item: Item<I>) => ReactNode // extra row buttons (shown with Edit)
}

function ItemForm(props: {
  initial?: Values
  submitLabel: string
  pending: boolean
  onSubmit: (v: Values) => void
  onCancel?: () => void
}) {
  const [name, setName] = useState(props.initial?.name ?? '')
  const [description, setDescription] = useState(props.initial?.description ?? '')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    props.onSubmit({ name, description: description || undefined })
  }
  return (
    <form className={ui.row} onSubmit={submit}>
      <label className={ui.field}>
        <span className="visually-hidden">Name</span>
        <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className={ui.field}>
        <span className="visually-hidden">Description</span>
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <button type="submit" className={ui.btnPrimary} disabled={props.pending}>
        {props.submitLabel}
      </button>
      {props.onCancel && (
        <button type="button" className={ui.btn} onClick={props.onCancel}>
          Cancel
        </button>
      )}
    </form>
  )
}

export function ItemsPanel<I extends string>({
  noun,
  items,
  canEdit,
  search,
  onCreate,
  onUpdate,
  actions,
}: Props<I>) {
  const { run, pending, error, clearError } = useRun()
  const [editing, setEditing] = useState<I | null>(null)
  const [formKey, setFormKey] = useState(0)

  const create = async (v: Values) => {
    if ((await run(() => onCreate(v))).ok) setFormKey((k) => k + 1)
  }
  const update = async (id: I, v: Values) => {
    if ((await run(() => onUpdate(id, v))).ok) setEditing(null)
  }

  return (
    <section className={ui.card}>
      <div className={ui.form}>
        <ItemForm
          key={formKey}
          submitLabel={`Add ${noun}`}
          pending={pending}
          onSubmit={(v) => void create(v)}
        />
        {search && (
          <label className={ui.field}>
            <span className="visually-hidden">Search</span>
            <input
              type="search"
              placeholder={`Search ${noun}s`}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
            />
          </label>
        )}
      </div>
      <ErrorBanner error={error} onDismiss={clearError} />
      {items === undefined ? (
        <p className={ui.empty}>Loading…</p>
      ) : items.length === 0 ? (
        <p className={ui.empty}>
          {search?.value ? `No ${noun}s match “${search.value}”.` : `No ${noun}s yet.`}
        </p>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <tbody>
              {items.map((item) =>
                editing === item._id ? (
                  <tr key={item._id}>
                    <td colSpan={2}>
                      <ItemForm
                        initial={item}
                        submitLabel="Save"
                        pending={pending}
                        onSubmit={(v) => void update(item._id, v)}
                        onCancel={() => setEditing(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={item._id}>
                    <td>
                      <div>{item.name}</div>
                      {item.description && <div className={ui.muted}>{item.description}</div>}
                    </td>
                    <td className={ui.actions}>
                      {canEdit && actions?.(item)}
                      {canEdit && (
                        <button
                          type="button"
                          className={`${ui.btn} ${ui.btnSmall}`}
                          onClick={() => setEditing(item._id)}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
