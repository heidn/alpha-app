# STATE (shared truth, ≤40 lines — rewrite, don't append)

## Architecture
- Vite 8 + React 19 + TS 6 (strict) SPA in `src/`. Lint: oxlint. Dev URL http://localhost:5173.
- Convex backend in `convex/`, one file per domain (`convex/<domain>.ts`).
- Auth: `ClerkProvider` → `ConvexProviderWithClerk` (`src/main.tsx`). Convex env `CLERK_FRONTEND_API_URL` = Clerk Frontend API URL.
- Users: `users` table keyed by `tokenIdentifier`; client calls `api.users.store` after sign-in (`src/features/auth/useStoreUser.ts`).
- Auth checks: `getCurrentUser(ctx)` / `requireUser(ctx)` / `requireRole(ctx, ...roles)` in `convex/users.ts`.
- Roles: `users.role` optional `admin|coach|athlete` (absent = athlete, via `roleOf`); defs in `convex/roles.ts` (no server imports, client-safe). Admin UI `src/features/admin/`; first admin via `npx convex run admin:grantAdmin`.
- Frontend features: `src/features/<feature>/`. UI conventions: `.claude/skills/react-ux` skill (load before UI work).
- Routing: tiny hash router `src/features/shell/useRoute.ts` (no dep). Styling: tokens in `src/index.css` + colocated CSS Modules.
- Shell: `App` -> LoginPage (unauth) | AppShell (nav + UserButton, routes home/admin).

## Conventions
- See CLAUDE.md. Each dev has own Convex dev deployment.

## Open decisions
- Test runner (none yet). CI.
- Domain model for workouts/classes/members not designed.
