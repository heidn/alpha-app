import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { todayISO } from './dates'
import { buildFixtures, classesOn, movements } from './fixtures'
import {
  actualMax,
  lastAtPercent,
  liftHistory,
  percentOf,
  projectedMax,
  resultKey,
  trainingMax,
  type Results,
} from './rules'
import type { Booking, ISODate, LiftResult, MetconResult, Settings } from './types'

// In-memory store seeded from fixtures. Swap for Convex queries/mutations later; screens only use this hook.

type State = ReturnType<typeof buildFixtures> & { results: Results; settings: Settings }

function useStoreState(today: ISODate) {
  const [state, setState] = useState<State>(() => ({
    ...buildFixtures(today),
    settings: { rxWeights: 'heavy', plateIncrement: 5 },
  }))

  return useMemo(() => {
    const { workouts, results, testedMaxes, bookings, settings } = state
    const workoutOn = (date: ISODate) => workouts.find((w) => w.date === date)
    const workoutById = (id: string) => workouts.find((w) => w.id === id)

    const liftStats = (movementId: string, percent: number | undefined, on: ISODate) => {
      const history = liftHistory(movementId, workouts, results)
      const actual = actualMax(movementId, history, testedMaxes)
      const projected = projectedMax(history, on, settings.plateIncrement)
      const tm = trainingMax(actual, projected, on)
      return {
        actual,
        projected,
        training: tm,
        prescribed: tm && percent !== undefined ? percentOf(tm.weight, percent, settings.plateIncrement) : undefined,
        lastAtPercent: percent !== undefined ? lastAtPercent(history, percent, on) : undefined,
        /** Top set from the most recent earlier session at `pct`, for any row of the table. */
        lastAt: (pct: number) => lastAtPercent(history, pct, on),
      }
    }

    const setBooking = (date: ISODate, booking: Booking | undefined) =>
      setState((s) => {
        const next = { ...s.bookings }
        if (booking) next[date] = booking
        else delete next[date]
        return { ...s, bookings: next }
      })

    return {
      today,
      settings,
      movementName: (id: string) => movements[id]?.name ?? id,
      workoutOn,
      workoutById,
      classesOn,
      bookingOn: (date: ISODate): Booking | undefined => bookings[date],
      liftResult: (workoutId: string) => results[resultKey(workoutId, 'lift')] as LiftResult | undefined,
      metconResult: (workoutId: string) => results[resultKey(workoutId, 'metcon')] as MetconResult | undefined,
      liftStats,
      saveResult: (workoutId: string, result: LiftResult | MetconResult) =>
        setState((s) => ({ ...s, results: { ...s.results, [resultKey(workoutId, result.kind)]: result } })),
      book: (date: ISODate, classSessionId: string) => setBooking(date, { classSessionId, status: 'booked' }),
      cancelBooking: (date: ISODate) => setBooking(date, undefined),
      setSignedIn: (date: ISODate, signedIn: boolean) => {
        const b = bookings[date]
        if (b) setBooking(date, { ...b, status: signedIn ? 'signedIn' : 'booked' })
      },
    }
  }, [state, today])
}

export type Store = ReturnType<typeof useStoreState>

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [today] = useState(todayISO)
  const store = useStoreState(today)
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore outside StoreProvider')
  return store
}
