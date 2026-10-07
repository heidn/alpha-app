// Shapes follow the design handoff (§3). Local fixtures for now; Convex later.

export type ISODate = string // YYYY-MM-DD, gym local time

export type Movement = { id: string; name: string }

export type WarmupItem = { qty: string; movementId: string }

export type LiftPart = { movementId: string; sets: number; reps: number; percent: number }

export type MetconType = 'amrap' | 'forTime' | 'emom' | 'maxLoad' | 'other'

export type MetconItem = {
  reps?: number
  movementId: string
  rxHeavy?: number
  rxLight?: number
  spec?: string
}

export type MetconPart = { type: MetconType; items: MetconItem[]; timeCapSec?: number }

export type Workout = {
  id: string
  date: ISODate
  track: string
  warmup: WarmupItem[]
  lift?: LiftPart
  metcon?: MetconPart
}

export type ClassSession = {
  id: string
  date: ISODate
  startsAt: string // HH:MM, 24h
  capacity?: number
  athletes: number
}

export type BookingStatus = 'booked' | 'signedIn'
export type Booking = { classSessionId: string; status: BookingStatus }

export type LiftSet = { reps: number; weight: number }
export type LiftResult = { kind: 'lift'; sets: LiftSet[]; notes?: string; loggedAt: ISODate }

export type Division = 'rx' | 'scaled'
export type MetconScore =
  | { kind: 'amrap'; rounds: number; reps: number }
  | { kind: 'forTime'; timeSec?: number; cappedReps?: number }
  | { kind: 'emom'; done: boolean }
  | { kind: 'maxLoad'; load: number }
export type MetconResult = {
  kind: 'metcon'
  division: Division
  score: MetconScore
  notes?: string
  loggedAt: ISODate
}

export type TestedMax = { movementId: string; weight: number; achievedAt: ISODate }

export type Settings = { rxWeights: 'heavy' | 'light'; plateIncrement: 5 | 2.5 }
