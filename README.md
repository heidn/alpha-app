# alpha-app
App for the Woodbury Alpha Strength workout class

`apps/web` Vite + React · `apps/mobile` Expo (iOS/Android) · Convex · Clerk — all TypeScript

- **Setup & team workflow:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Claude Code rules:** [CLAUDE.md](CLAUDE.md)

```bash
npm ci
npm run dev:backend   # terminal 1: Convex dev deployment
npm run dev           # terminal 2: web, http://localhost:5173

npm run setup:mobile  # once: mobile has its own install
npm run dev:mobile    # Expo dev server (Expo Go / simulator)
```
