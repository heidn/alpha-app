import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Open the dev server in Chrome (an explicit BROWSER env var wins).
process.env.BROWSER ??= 'chrome'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { open: true },
  // .env.local lives at the repo root (written there by `convex dev`).
  envDir: '../..',
})
