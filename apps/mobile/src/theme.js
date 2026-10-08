// ─────────────────────────────────────────────────────────────────────────────
// Alpha mobile theme
//
// Edit hex values here. They feed both the Tailwind classes (tailwind.config.js:
// `bg-surface`, `text-accent`, `border-line`, …) and the few places code needs a
// raw color (SVG icon strokes, animated values). Restart Expo with `--clear`
// after changing this file so Tailwind recompiles.
//
// Current theme: "dark" — the Claude Design handoff (Oct 2026). Dark mode only.
// White fills are the primary action color (Sign in, +, Save, selected states)
// with near-black `ink` text on them. Orange `accent` is for section headings,
// TODAY, attendance bars and the heaviest set.
//
// To add a theme: copy `dark`, change the hexes, and point `currentTheme` at it.
// Every theme must define the same keys.
// ─────────────────────────────────────────────────────────────────────────────

export const themes = {
  dark: {
    // Backgrounds, darkest to lightest
    bg: '#0B0B0C', // app background
    surface: '#121214', // percentage table rows
    'surface-2': '#141416', // text inputs
    'surface-3': '#18181B', // segmented-control track, pressed steppers

    // Lines
    line: '#222225', // dividers, card borders
    'line-strong': '#3A3A3F', // stepper outlines, outline buttons
    'cell-line': '#2A2A2E', // calendar day squares
    'line-dashed': '#6E6E74', // dashed card border (projected, placeholders)

    // Text on dark
    fg: '#FFFFFF', // primary text
    'fg-2': '#CFCFD2', // dimmed text (past days)
    muted: '#A9A9AE', // labels, units, quantities

    // On white fills
    white: '#FFFFFF', // primary actions, selected card
    ink: '#0B0B0C', // text on white
    'muted-ink': '#55555A', // secondary text on white
    divider: '#D4D4D8', // divider on white

    // Accent
    accent: '#FF5A3C', // section headings, TODAY, attendance bar, heaviest set
    'accent-ink': '#D63A1E', // accent text on white (accent on white is only ~3:1)
  },
}

export const currentTheme = 'dark'

/** Colors of the active theme. */
export const color = themes[currentTheme]

// Fonts. Custom fonts don't synthesize weights in React Native, so each weight is
// its own family (`font-sans-medium`, not `font-sans font-medium`). Loaded in app/_layout.tsx.
export const font = {
  radwave: 'Radwave', // logo and the big Sign in pill (commercial font: license needed)
  sans: 'SpaceGrotesk_400Regular', // reading text
  'sans-medium': 'SpaceGrotesk_500Medium',
  'sans-semibold': 'SpaceGrotesk_600SemiBold',
  mono: 'IBMPlexMono_400Regular', // numbers, data, small uppercase labels
  'mono-medium': 'IBMPlexMono_500Medium',
}
