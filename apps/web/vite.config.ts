import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // .env.local lives at the repo root (written there by `convex dev`).
  envDir: '../..',
})
