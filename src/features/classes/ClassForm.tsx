import { useQuery } from 'convex/react'
import { useState, type FormEvent } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import ui from '../ui/ui.module.css'
import styles from './ClassForm.module.css'
import { DAY_SHORT } from './days.ts'

export type ClassValues = {
  coachId: Id<'users'>
  name: string
  startTime: string
  durationMin?: number
  daysOfWeek: number[]
}

type Props = {
  gymId: Id<'gyms'>
  initial?: ClassValues
  pending: boolean
  submitLabel: string
  onSubmit: (values: ClassValues) => void
  onCancel: () => void
}

export function ClassForm({ gymId, initial, pending, submitLabel, onSubmit, onCancel }: Props) {
  const staff = useQuery(api.gyms.staff, { gymId })
  const [name, setName] = useState(initial?.name ?? '')
  const [coachId, setCoachId] = useState<string>(initial?.coachId ?? '')
  const [startTime, setStartTime] = useState(initial?.startTime ?? '06:00')
  const [duration, setDuration] = useState(initial?.durationMin?.toString() ?? '60')
  const [days, setDays] = useState<number[]>(initial?.daysOfWeek ?? [1, 2, 3, 4, 5])

  const coach = staff?.find((s) => s._id === coachId)
  const toggle = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!coach) return
    onSubmit({
      coachId: coach._id,
      name,
      startTime,
      durationMin: duration ? Number(duration) : undefined,
      daysOfWeek: days,
    })
  }

  return (
    <form className={ui.form} onSubmit={submit}>
      <div className={ui.row}>
        <label className={ui.field}>
          Name
          <input
            required
            placeholder="6 AM"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className={ui.field}>
          Coach
          <select required value={coachId} onChange={(e) => setCoachId(e.target.value)}>
            <option value="">{staff === undefined ? 'Loading…' : 'Choose a coach…'}</option>
            {staff?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={ui.row}>
        <label className={ui.field}>
          Start time
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </label>
        <label className={ui.field}>
          Duration (min)
          <input
            type="number"
            min={1}
            max={600}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </label>
      </div>
      <fieldset className={styles.days}>
        <legend>Days</legend>
        {DAY_SHORT.map((label, d) => (
          <label key={label} className={styles.day}>
            <input type="checkbox" checked={days.includes(d)} onChange={() => toggle(d)} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <div className={ui.formActions}>
        <button type="button" className={ui.btn} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className={ui.btnPrimary}
          disabled={pending || !coach || days.length === 0}
          title={
            !coach ? 'Choose a coach' : days.length === 0 ? 'Pick at least one day' : undefined
          }
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
