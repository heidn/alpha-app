# STATE (shared truth, ≤40 lines — rewrite, don't append)

## Architecture
- Layout: `apps/web` (Vite 8 + React 19 + TS 6 strict SPA, npm workspace, envDir = repo root), `apps/mobile` (Expo SDK 57/RN 0.86 + Expo Router, separate install, metro watches `convex/`; athlete app from Claude Design handoff: Today/log sheets/calendar/past day/PR on an in-memory fixture store `src/data/store.tsx`, rules in `src/data/rules.ts`; Clerk sign-in via `src/auth/`, keys from root .env.local through app.config.js), `convex/` at root.
- Web: `apps/web/src/`. Lint: oxlint. Dev URL http://localhost:5173.
- Convex backend in `convex/`, one file per domain (`convex/<domain>.ts`).
- Auth: `ClerkProvider` → `ConvexProviderWithClerk` (`apps/web/src/main.tsx`). Convex env `CLERK_FRONTEND_API_URL` = Clerk Frontend API URL.
- Users: `users` table keyed by `tokenIdentifier`; client calls `api.users.store` after sign-in (`apps/web/src/features/auth/useStoreUser.ts`).
- Auth checks: `getCurrentUser(ctx)` / `requireUser(ctx)` / `requireRole(ctx, ...roles)` in `convex/users.ts`.
- Roles: `users.role` optional `admin|coach|athlete` (absent = athlete, via `roleOf`); defs in `convex/roles.ts` (no server imports, client-safe). Admin UI `apps/web/src/features/admin/`; first admin via `npx convex run admin:grantAdmin`. Admin invites (`convex/invites.ts`): role held in `userInvites`, claimed in `users.store` if email verified.
- Frontend features: `apps/web/src/features/<feature>/`. UI conventions: `.claude/skills/react-ux` skill (load before UI work).
- Routing: tiny hash router `apps/web/src/features/shell/useRoute.ts` (no dep). Styling: tokens in `apps/web/src/index.css` + colocated CSS Modules.
- Shell: `App` -> LoginPage (unauth) | AppShell (nav + UserButton, routes home/admin).

## Domain model (`convex/schema.ts`, validators in `convex/domain.ts`)
- Member = `users`. Gym staff via `gymMembers`; athletes join a class once (`classMembers`, `classInvites` claimed by email in `users.store`) and see its daily workout.
- `workouts` (one per class+date) embed `program`: sections→exercises→prescriptions, order = array order, items have stable client `key`; `score` present = scored item.
- `memberLogs` separate (hot writes), sets embedded, keyed by `workoutId+itemKey`; `exerciseId` copied for history. Auth helpers `convex/access.ts` (gym staff = `gymMembers.staff`).
- Client: routes `#/gyms[/:id]`, `#/classes/:id`, `#/library`, `#/workouts[/:id]`; shared `apps/web/src/features/ui/` (ui.module.css, ErrorBanner, useRun).

## Conventions
- See CLAUDE.md. Each dev has own Convex dev deployment.

## Open decisions
- Test runner (none yet). CI.
- Mobile → Convex: map handoff model (bookings, 1RM, per-type metcon scores) onto workouts/memberLogs; needs Clerk Expo auth. Leaderboard/Menu not designed.
