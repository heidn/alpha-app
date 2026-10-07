import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { ClassesPanel } from '../classes/ClassesPanel.tsx'
import { hrefFor } from '../shell/useRoute.ts'
import { ErrorBanner } from '../ui/ErrorBanner.tsx'
import ui from '../ui/ui.module.css'
import { useRun } from '../ui/useRun.ts'
import { GymForm, type GymValues } from './GymForm.tsx'
import { MembersPanel } from './MembersPanel.tsx'
import { StaffPanel } from './StaffPanel.tsx'

const TABS = ['classes', 'staff', 'members'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, string> = {
  classes: 'Classes',
  staff: 'Staff',
  members: 'Members',
}

export function GymPage({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const gym = useQuery(api.gyms.get, { gymId: id })
  const update = useMutation(api.gyms.update)
  const { run, pending, error, clearError } = useRun()
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<Tab>('classes')

  if (gym === undefined) return <p className={ui.muted}>Loading gym…</p>
  if (gym === null) return <p className={ui.muted}>Gym not found.</p>

  const onSave = async (values: GymValues) => {
    if ((await run(() => update({ gymId: gym._id, ...values }))).ok) setEditing(false)
  }

  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div>
          <a className={ui.crumb} href={hrefFor({ name: 'gyms' })}>
            ← Gyms
          </a>
          <h1>{gym.name}</h1>
          <p className={ui.sub}>{gym.isOnline ? 'Online gym' : gym.address || 'No address'}</p>
        </div>
        {isAdmin && !editing && (
          <button type="button" className={ui.btn} onClick={() => setEditing(true)}>
            Edit gym
          </button>
        )}
      </header>

      <ErrorBanner error={error} onDismiss={clearError} />

      {editing && (
        <section className={ui.card} aria-label="Edit gym">
          <GymForm
            initial={gym}
            pending={pending}
            submitLabel="Save"
            onSubmit={(v) => void onSave(v)}
            onCancel={() => setEditing(false)}
          />
        </section>
      )}

      <div className={ui.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            className={ui.tab}
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'classes' && <ClassesPanel gymId={gym._id} />}
      {tab === 'staff' && <StaffPanel gymId={gym._id} isAdmin={isAdmin} />}
      {tab === 'members' && <MembersPanel gymId={gym._id} />}
    </div>
  )
}
