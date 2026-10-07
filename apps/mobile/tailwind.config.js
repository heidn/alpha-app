// Tailwind loads this with jiti, so it can read the TypeScript tokens directly.
const { color, font } = require('./src/tokens.ts')

// Custom fonts don't synthesize weights in React Native, so each weight is its own family:
// use `font-sans-medium`, not `font-sans font-medium`.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // The app is dark-only (app.json userInterfaceStyle), which sets the scheme manually; NativeWind needs 'class' for that.
  darkMode: 'class',
  theme: {
    extend: {
      colors: color,
      fontFamily: Object.fromEntries(Object.entries(font).map(([k, v]) => [k, [v]])),
    },
  },
}
