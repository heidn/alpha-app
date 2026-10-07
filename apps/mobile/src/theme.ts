import { StyleSheet } from 'react-native'

export const color = {
  bg: '#0B0B0C',
  surface: '#121214',
  surface2: '#141416',
  surface3: '#18181B',
  line: '#222225',
  lineStrong: '#3A3A3F',
  cellLine: '#2A2A2E',
  dashed: '#6E6E74',
  text: '#FFFFFF',
  text2: '#CFCFD2',
  muted: '#A9A9AE',
  mutedOnWhite: '#55555A',
  accent: '#FF5A3C',
  // Deeper accent for small text on white (accent on white is ~3:1).
  accentOnWhite: '#D63A1E',
  white: '#FFFFFF',
} as const

export const font = {
  radwave: 'Radwave',
  sans: 'SpaceGrotesk_400Regular',
  sansMedium: 'SpaceGrotesk_500Medium',
  sansSemi: 'SpaceGrotesk_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const

export const gutter = 20

export const type = StyleSheet.create({
  sectionHeading: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    letterSpacing: 13 * 0.16,
    textTransform: 'uppercase',
    color: color.accent,
  },
  title: { fontFamily: font.sansMedium, fontSize: 30, lineHeight: 32, color: color.text },
  body: { fontFamily: font.sans, fontSize: 17, lineHeight: 23, color: color.text },
  monoSub: { fontFamily: font.mono, fontSize: 15, color: color.muted },
  monoLabel: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: 11 * 0.14,
    textTransform: 'uppercase',
    color: color.muted,
  },
})
