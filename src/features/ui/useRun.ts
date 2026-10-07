import { ConvexError } from 'convex/values'
import { useCallback, useState } from 'react'

type Result<T> = { ok: true; value: T } | { ok: false }

// Wraps a mutation call with pending + user-facing error state.
export function useRun() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<Result<T>> => {
    setError(null)
    setPending(true)
    try {
      return { ok: true, value: await fn() }
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : 'Something went wrong. Try again.')
      return { ok: false }
    } finally {
      setPending(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { run, pending, error, clearError, setError }
}
