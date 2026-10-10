import { useMutation, useQuery } from 'convex/react'
import { useDeferredValue, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import ui from '../ui/ui.module.css'
import { fixedLabel, parseOption, type Fixed } from './testOption.ts'
import styles from './WorkoutEditor.module.css'

type Props = {
  onPick: (id: Id<'exercises'>, name: string, fixed?: Fixed) => void
  onError: (msg: string) => void
  // Test options: "2k row" searches "row" and picks Row + 2000 m.
  withAmount?: boolean
  placeholder?: string
}

// Search the library; offer to add the typed name when nothing matches exactly.
export function ExercisePicker({ onPick, onError, withAmount, placeholder }: Props) {
  const [text, setText] = useState('')
  const typed = useDeferredValue(text.trim())
  const { name: term, fixed } = withAmount ? parseOption(typed) : { name: typed, fixed: undefined }
  const suffix = fixed ? ` · ${fixedLabel(fixed)}` : ''
  const results = useQuery(api.library.listExercises, term ? { search: term } : 'skip')
  const create = useMutation(api.library.createExercise)
  const exact = results?.some((r) => r.name.toLowerCase() === term.toLowerCase())

  const pick = (id: Id<'exercises'>, name: string) => {
    onPick(id, name, fixed)
    setText('')
  }
  const addNew = async () => {
    try {
      pick(await create({ name: term }), term)
    } catch {
      onError('Couldn’t add that exercise. Try again.')
    }
  }

  return (
    <div className={styles.picker}>
      <label>
        <span className="visually-hidden">Add exercise</span>
        <input
          className={ui.input}
          type="search"
          placeholder={placeholder ?? '+ Add exercise (search)'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {term && (
        <ul className={styles.results}>
          {results?.map((r) => (
            <li key={r._id}>
              <button type="button" onClick={() => pick(r._id, r.name)}>
                {r.name}
                {suffix}
              </button>
            </li>
          ))}
          {results && !exact && (
            <li>
              <button type="button" onClick={() => void addNew()}>
                Add “{term}” to library{suffix}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
