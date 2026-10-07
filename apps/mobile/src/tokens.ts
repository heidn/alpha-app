// Design tokens (Claude Design handoff §2). Single source for tailwind.config.ts and for code that
// needs raw values (SVG strokes, animated colors). No imports: Tailwind's config loads this in Node.

export const color = {
  bg: '#0B0B0C',
  ink: '#0B0B0C', // text on white fills
  surface: '#121214',
  'surface-2': '#141416',
  'surface-3': '#18181B',
  line: '#222225',
  'line-strong': '#3A3A3F',
  'cell-line': '#2A2A2E',
  dashed: '#6E6E74',
  fg: '#FFFFFF',
  'fg-2': '#CFCFD2',
  muted: '#A9A9AE',
  'muted-ink': '#55555A', // secondary text on white
  accent: '#FF5A3C',
  'accent-ink': '#D63A1E', // accent text on white (accent on white is ~3:1)
  divider: '#D4D4D8', // divider on white
  white: '#FFFFFF',
} as const

export const font = {
  radwave: 'Radwave',
  sans: 'SpaceGrotesk_400Regular',
  'sans-medium': 'SpaceGrotesk_500Medium',
  'sans-semibold': 'SpaceGrotesk_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  'mono-medium': 'IBMPlexMono_500Medium',
} as const
