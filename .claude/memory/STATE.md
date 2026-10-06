# STATE (shared truth, ≤40 lines — rewrite, don't append)

## Architecture
- Vite 8 + React 19 + TS 6 (strict) SPA in `src/`. Lint: oxlint. Dev URL http://localhost:5173.
- Convex backend in `convex/`, one file per domain (`convex/<domain>.ts`).
- Auth: `ClerkProvider` → `ConvexProviderWithClerk` (`src/main.tsx`). Convex env `CLERK_FRONTEND_API_URL` = Clerk Frontend API URL.
- Users: `users` table keyed by `tokenIdentifier`; client calls `api.users.store` after sign-in (`src/features/auth/useStoreUser.ts`).
- Auth checks: `getCurrentUser(ctx)` / `requireUser(ctx)` in `convex/users.ts`.
- Frontend features: `src/features/<feature>/`.

## Conventions
- See CLAUDE.md. Each dev has own Convex dev deployment.

## Open decisions
- Router (none yet). Styling approach. Test runner (none yet). CI.
- Domain model for workouts/classes/members not designed.
