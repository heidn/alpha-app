import { useState, type FormEvent } from 'react'
import ui from '../ui/ui.module.css'

export type GymValues = { name: string; address: string; isOnline: boolean; timeZone: string }

const US_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
]

type Props = {
  initial?: GymValues
  pending: boolean
  submitLabel: string
  onSubmit: (values: GymValues) => void
  onCancel: () => void
}

export function GymForm({ initial, pending, submitLabel, onSubmit, onCancel }: Props) {
  // Copy only the form's fields: `initial` may be a whole gym (with _id).
  const [values, setValues] = useState<GymValues>({
    name: initial?.name ?? '',
    address: initial?.address ?? '',
    isOnline: initial?.isOnline ?? false,
    timeZone: initial?.timeZone ?? 'America/Chicago',
  })
  const zones = US_ZONES.includes(values.timeZone) ? US_ZONES : [...US_ZONES, values.timeZone]
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
      <label className={ui.field}>
        Time zone (used for workout release times)
        <select
          value={values.timeZone}
          onChange={(e) => setValues({ ...values, timeZone: e.target.value })}
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace('_', ' ')}
            </option>
          ))}
        </select>
      </label>
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
