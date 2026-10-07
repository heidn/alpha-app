// Extends app.json. Reuses the web app's public keys from the repo-root .env.local
// (written by `convex dev`), so both apps talk to the same Clerk app and Convex deployment.
// EXPO_PUBLIC_* in the environment wins. Both values are public (shipped to clients).
const fs = require('fs')
const path = require('path')

function readRootEnv() {
  const file = path.join(__dirname, '..', '..', '.env.local')
  if (!fs.existsSync(file)) return {}
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}

module.exports = ({ config }) => {
  const root = readRootEnv()
  return {
    ...config,
    extra: {
      ...config.extra,
      clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? root.VITE_CLERK_PUBLISHABLE_KEY,
      convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL ?? root.VITE_CONVEX_URL,
      // Where the Menu's web-app links go. Defaults to the local Vite dev server.
      webUrl: process.env.WEB_APP_URL ?? 'http://localhost:5173',
    },
  }
}
