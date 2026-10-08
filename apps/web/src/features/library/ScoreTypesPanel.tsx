import { useMutation, useQuery } from 'convex/react'
import { useState, type FormEvent } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { SCORE_FIELDS, type ScoreField } from '../../../../../convex/domain'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import { FIELD_LABEL } from './labels.ts'

type Values = { name: string; fields: ScoreField[]; perSet: boolean; sort: 'asc' | 'desc' }
const EMPTY: Values = { name: '', fields: [], perSet: false, sort: 'desc' }

function ScoreTypeForm(props: {
  initial?: Values
  pending: boolean
  submitLabel: string
  onSubmit: (v: Values) => void
  onCancel: () => void
}) {
  const [v, setV] = useState<Values>(props.initial ?? EMPTY)
  const toggle = (f: ScoreField) =>
    setV({
      ...v,
      fields: v.fields.includes(f) ? v.fields.filter((x) => x !== f) : [...v.fields, f],
    })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    props.onSubmit(v)
  }
  return (
    <form className={ui.form} onSubmit={submit}>
      <div className={ui.row}>
        <label className={ui.field}>
          Name
          <input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </label>
        <label className={ui.field}>
          Leaderboard order
          <select
            value={v.sort}
            onChange={(e) => setV({ ...v, sort: e.target.value === 'asc' ? 'asc' : 'desc' })}
          >
            <option value="desc">Higher is better</option>
            <option value="asc">Lower is better (time)</option>
          </select>
        </label>
      </div>
      <div className={ui.row}>
        {SCORE_FIELDS.map((f) => (
          <label key={f} className={ui.check}>
            <input type="checkbox" checked={v.fields.includes(f)} onChange={() => toggle(f)} />
            {FIELD_LABEL[f]}
          </label>
        ))}
      </div>
      <label className={ui.check}>
        <input
          type="checkbox"
          checked={v.perSet}
          onChange={(e) => setV({ ...v, perSet: e.target.checked })}
        />
        One input row per set
      </label>
      <div className={ui.formActions}>
        <button type="button" className={ui.btn} onClick={props.onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className={ui.btnPrimary}
          disabled={props.pending || v.fields.length === 0}
          title={v.fields.length === 0 ? 'Pick at least one field' : undefined}
        >
          {props.submitLabel}
        </button>
      </div>
    </form>
  )
}

export function ScoreTypesPanel({ isAdmin }: { isAdmin: boolean }) {
  const types = useQuery(api.library.listScoreTypes)
  const create = useMutation(api.library.createScoreType)
  const update = useMutation(api.library.updateScoreType)
  const { run, pending, error, clearError } = useRun()
  const [editing, setEditing] = useState<Id<'scoreTypes'> | 'new' | null>(null)

  const onSubmit = async (v: Values) => {
    const r = await run(() =>
      editing === 'new' || editing === null ? create(v) : update({ scoreTypeId: editing, ...v }),
    )
    if (r.ok) setEditing(null)
  }
  const current = editing && editing !== 'new' ? types?.find((t) => t._id === editing) : undefined

  return (
    <section className={ui.card}>
      <div className={ui.cardHead}>
        <h2>Score types</h2>
        {isAdmin && editing === null && (
          <button type="button" className={ui.btnPrimary} onClick={() => setEditing('new')}>
            New score type
          </button>
        )}
      </div>
      <ErrorBanner error={error} onDismiss={clearError} />
      {editing !== null && (
        <ScoreTypeForm
          key={editing}
          initial={current}
          pending={pending}
          submitLabel={editing === 'new' ? 'Create' : 'Save'}
          onSubmit={(v) => void onSubmit(v)}
          onCancel={() => setEditing(null)}
        />
      )}
      {types === undefined ? (
        <p className={ui.empty}>Loading…</p>
      ) : types.length === 0 ? (
        <p className={ui.empty}>No score types. Run seed:scoreTypes or create one.</p>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Inputs</th>
                {isAdmin && (
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t._id}>
                  <td>{t.name}</td>
                  <td className={ui.muted}>
                    {t.fields.map((f) => FIELD_LABEL[f]).join(', ')}
                    {t.perSet ? ' · per set' : ''}
                  </td>
                  {isAdmin && (
                    <td className={ui.actions}>
                      <button
                        type="button"
                        className={`${ui.btn} ${ui.btnSmall}`}
                        onClick={() => setEditing(t._id)}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
