# STATE (shared truth, ≤40 lines — rewrite, don't append)

## Architecture
- Vite 8 + React 19 + TS 6 (strict) SPA in `src/`. Lint: oxlint. Dev URL http://localhost:5173.
- Convex backend in `convex/`, one file per domain (`convex/<domain>.ts`).
- Auth: `ClerkProvider` → `ConvexProviderWithClerk` (`src/main.tsx`). Convex env `CLERK_FRONTEND_API_URL` = Clerk Frontend API URL.
- Users: `users` table keyed by `tokenIdentifier`; client calls `api.users.store` after sign-in (`src/features/auth/useStoreUser.ts`).
- Auth checks: `getCurrentUser(ctx)` / `requireUser(ctx)` / `requireRole(ctx, ...roles)` in `convex/users.ts`.
- Roles: `users.role` optional `admin|coach|athlete` (absent = athlete, via `roleOf`); defs in `convex/roles.ts` (no server imports, client-safe). Admin UI `src/features/admin/`; first admin via `npx convex run admin:grantAdmin`. Admin invites (`convex/invites.ts`): role held in `userInvites`, claimed in `users.store` if email verified.
- Frontend features: `src/features/<feature>/`. UI conventions: `.claude/skills/react-ux` skill (load before UI work).
- Routing: tiny hash router `src/features/shell/useRoute.ts` (no dep). Styling: tokens in `src/index.css` + colocated CSS Modules.
- Shell: `App` -> LoginPage (unauth) | AppShell (nav + UserButton, routes home/admin).

## Domain model (`convex/schema.ts`, validators in `convex/domain.ts`)
- Member = `users`. Gym staff via `gymMembers`; athletes join a class once (`classMembers`, `classInvites` claimed by email in `users.store`) and see its daily workout.
- `workouts` (one per class+date) embed `program`: sections→exercises→prescriptions, order = array order, items have stable client `key`; `score` present = scored item.
- `memberLogs` separate (hot writes), sets embedded, keyed by `workoutId+itemKey`; `exerciseId` copied for history. Auth helpers `convex/access.ts` (gym staff = `gymMembers.staff`).
- Client: routes `#/gyms[/:id]`, `#/classes/:id`, `#/library`, `#/workouts[/:id]`; shared `src/features/ui/` (ui.module.css, ErrorBanner, useRun).

## Conventions
- See CLAUDE.md. Each dev has own Convex dev deployment.

## Open decisions
- Test runner (none yet). CI.
- Athlete-facing UI (today's WOD via `workouts.myDay`, result logging/leaderboard) not built; memberLogs mutations TBD.
