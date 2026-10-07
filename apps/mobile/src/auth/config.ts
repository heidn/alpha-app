import Constants from 'expo-constants'

type Extra = { clerkPublishableKey?: string; convexUrl?: string }

const extra = (Constants.expoConfig?.extra ?? {}) as Extra

export const clerkPublishableKey = extra.clerkPublishableKey
export const convexUrl = extra.convexUrl
