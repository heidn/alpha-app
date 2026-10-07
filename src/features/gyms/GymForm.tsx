import { useState, type FormEvent } from 'react'
import ui from '../ui/ui.module.css'

export type GymValues = { name: string; address: string; isOnline: boolean }

type Props = {
  initial?: GymValues
  pending: boolean
  submitLabel: string
  onSubmit: (values: GymValues) => void
  onCancel: () => void
}

export function GymForm({ initial, pending, submitLabel, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<GymValues>(
    initial ?? { name: '', address: '', isOnline: false },
  )
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(values)
  }
  return (
    <form className={ui.form} onSubmit={submit}>
      <div className={ui.row}>
        <label className={ui.field}>
          Name
          <input
            required
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
          />
        </label>
        <label className={ui.field}>
          Address
          <input
            value={values.address}
            onChange={(e) => setValues({ ...values, address: e.target.value })}
          />
        </label>
      </div>
      <label className={ui.check}>
        <input
          type="checkbox"
          checked={values.isOnline}
          onChange={(e) => setValues({ ...values, isOnline: e.target.checked })}
        />
        Online gym (no physical location)
      </label>
      <div className={ui.formActions}>
        <button type="button" className={ui.btn} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={ui.btnPrimary} disabled={pending}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
