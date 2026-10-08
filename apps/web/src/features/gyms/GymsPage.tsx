import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import { hrefFor, navigate } from '../shell/useRoute.ts'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import { GymForm, type GymValues } from './GymForm.tsx'

export function GymsPage({ isAdmin }: { isAdmin: boolean }) {
  const gyms = useQuery(api.gyms.list)
  const create = useMutation(api.gyms.create)
  const { run, pending, error, clearError } = useRun()
  const [adding, setAdding] = useState(false)

  const onCreate = async (values: GymValues) => {
    const r = await run(() => create(values))
    if (r.ok) navigate({ name: 'gym', id: r.value })
  }

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div>
          <h1>Gyms</h1>
          <p className={ui.sub}>
            {isAdmin ? 'Create gyms and assign their coaches.' : 'Gyms where you coach.'}
          </p>
        </div>
        {isAdmin && !adding && (
          <button type="button" className={ui.btnPrimary} onClick={() => setAdding(true)}>
            New gym
          </button>
        )}
      </header>

      <ErrorBanner error={error} onDismiss={clearError} />

      {adding && (
        <section className={ui.card} aria-label="New gym">
          <GymForm
            pending={pending}
            submitLabel="Create gym"
            onSubmit={(v) => void onCreate(v)}
            onCancel={() => setAdding(false)}
          />
        </section>
      )}

      <section className={ui.card}>
        {gyms === undefined ? (
          <p className={ui.empty}>Loading gyms…</p>
        ) : gyms.length === 0 ? (
          <p className={ui.empty}>
            {isAdmin ? 'No gyms yet. Create the first one.' : 'You’re not staff at any gym yet.'}
          </p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Gym</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {gyms.map((g) => (
                  <tr key={g._id}>
                    <td>
                      <a href={hrefFor({ name: 'gym', id: g._id })}>{g.name}</a>
                    </td>
                    <td className={ui.muted}>{g.isOnline ? 'Online' : g.address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
