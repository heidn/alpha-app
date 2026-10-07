import Constants from 'expo-constants'

type Extra = { clerkPublishableKey?: string; convexUrl?: string; webUrl?: string }

const extra = (Constants.expoConfig?.extra ?? {}) as Extra

export const clerkPublishableKey = extra.clerkPublishableKey
export const convexUrl = extra.convexUrl
export const webUrl = (extra.webUrl ?? 'http://localhost:5173').replace(/\/$/, '')
