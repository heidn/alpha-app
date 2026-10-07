import { useMutation, useQuery } from 'convex/react'
import { useDeferredValue, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import ui from '../ui/ui.module.css'
import { ItemsPanel } from './ItemsPanel.tsx'
import { ScoreTypesPanel } from './ScoreTypesPanel.tsx'

const TABS = ['sections', 'exercises', 'scoreTypes'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, string> = {
  sections: 'Sections',
  exercises: 'Exercises',
  scoreTypes: 'Score types',
}

function SectionsTab({ isAdmin }: { isAdmin: boolean }) {
  const sections = useQuery(api.library.listSections)
  const create = useMutation(api.library.createSection)
  const update = useMutation(api.library.updateSection)
  return (
    <ItemsPanel
      noun="section"
      items={sections?.map((s) => ({ _id: s._id, name: s.title, description: s.description }))}
      canEdit={isAdmin}
      onCreate={(v) => create({ title: v.name, description: v.description })}
      onUpdate={(id, v) => update({ sectionId: id, title: v.name, description: v.description })}
    />
  )
}

function ExercisesTab({ isAdmin }: { isAdmin: boolean }) {
  const [search, setSearch] = useState('')
  const term = useDeferredValue(search.trim())
  const exercises = useQuery(api.library.listExercises, term ? { search: term } : {})
  const create = useMutation(api.library.createExercise)
  const update = useMutation(api.library.updateExercise)
  return (
    <ItemsPanel
      noun="exercise"
      items={exercises}
      canEdit={isAdmin}
      search={{ value: search, onChange: setSearch }}
      onCreate={(v) => create(v)}
      onUpdate={(id, v) => update({ exerciseId: id, ...v })}
    />
  )
}

export function LibraryPage({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>('sections')
  return (
    <div className={ui.page}>
      <header className={ui.header}>
        <div>
          <h1>Library</h1>
          <p className={ui.sub}>Reusable sections, exercises and scoring used to build workouts.</p>
        </div>
      </header>
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
      {tab === 'sections' && <SectionsTab isAdmin={isAdmin} />}
      {tab === 'exercises' && <ExercisesTab isAdmin={isAdmin} />}
      {tab === 'scoreTypes' && <ScoreTypesPanel isAdmin={isAdmin} />}
    </div>
  )
}
