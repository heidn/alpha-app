# STATE (shared truth, ≤40 lines — rewrite, don't append)

## Architecture
- Layout: `apps/web` (Vite 8 + React 19 + TS 6 strict SPA, npm workspace, envDir = repo root), `apps/mobile` (Expo SDK 57/RN 0.86 + Expo Router, separate install, metro watches `convex/`; athlete app from Claude Design handoff: Today/log sheets/calendar/past day/PR on an in-memory fixture store `src/data/store.tsx`, rules in `src/data/rules.ts`; Clerk sign-in via `src/auth/`, keys from root .env.local through app.config.js; UI = Tailwind via NativeWind 4 mini library `src/ui` (Text, Layout, Card, Button, Field, Stepper, Segmented, Section, ListRow); page shell `src/shell/Screen`; colors/fonts in commented `src/theme.js` feed tailwind.config.js; screens compose, no StyleSheet for visuals), `convex/` at root.
- Web: `apps/web/src/`. Lint: oxlint. Dev URL http://localhost:5173.
- Convex backend in `convex/`, one file per domain (`convex/<domain>.ts`).
- Auth: `ClerkProvider` → `ConvexProviderWithClerk` (`apps/web/src/main.tsx`). Convex env `CLERK_FRONTEND_API_URL` = Clerk Frontend API URL.
- Users: `users` table keyed by `tokenIdentifier`; client calls `api.users.store` after sign-in (`apps/web/src/features/auth/useStoreUser.ts`); it passes `imageUrl` (Clerk photo, `user.hasImage ? imageUrl : null`, omitted = keep) → `users.imageUrl`, img.clerk.com only. UI avatar: `features/ui/Avatar`. No `tokenIdentifier` = imported athlete not signed in yet; `store` claims it when exactly one user has the same `nameKey` (norm(name), kept on all users).
- Auth checks: `getCurrentUser(ctx)` / `requireUser(ctx)` / `requireRole(ctx, ...roles)` in `convex/users.ts`.
- Roles: `users.role` optional `admin|coach|athlete` (absent = athlete, via `roleOf`); defs in `convex/roles.ts` (no server imports, client-safe). Admin UI `apps/web/src/features/admin/`; first admin via `npx convex run admin:grantAdmin`. Admin invites (`convex/invites.ts`): role held in `userInvites`, claimed in `users.store` if email verified.
- Frontend features: `apps/web/src/features/<feature>/`. UI conventions: `.claude/skills/react-ux` skill (load before UI work).
- Routing: tiny hash router `apps/web/src/features/shell/useRoute.ts` (no dep). Styling: tokens in `apps/web/src/index.css` + colocated CSS Modules.
- Shell: `App` -> LoginPage (unauth) | AppShell. Staff nav = Program (`#/workouts`, also `#/`) / Library / Setup (`SetupNav`: gyms+classes, Users `#/admin`, Imports); athletes get HomePage. Leaderboard via per-day Results link `#/leaderboard/<date>`. AppShell shows OnboardingPage (first/last name + gender, `users.completeProfile`) until `users.gender` set.

## Domain model (`convex/schema.ts`, validators in `convex/domain.ts`)
- Member = `users`. Gym staff via `gymMembers`; athletes join a class once (`classMembers`, `classInvites` claimed by email in `users.store`) and see its daily workout.
- Class = program: `times` (start times, absent = [startTime]; startTime kept = times[0]) share one workout per day. `release` {day before|same, time} gates athletes (`myDay`/`get`, server clock via `nowFor(asOf)`), gym `timeZone` (default America/Chicago), math in `convex/release.ts`.
- `workouts` (one per class+date) embed `program`: sections→exercises→prescriptions, order = array order, items have stable client `key`; `score` present = scored item; metcon sections may carry `format` (forTime|amrap|emom|intervals) + `timeCapSec`; `kind` decides scoring (server-enforced): metcon = section score from format, strength = per exercise, notes = none, absent = legacy custom; test = pick-one: no section score, each option = exercise + one fixed amount (distance/durationSec/calories/reps) scored on its own (web `features/workouts/testOption.ts` parses "2k row" → Row + 2000 m).
- `memberLogs` separate (hot writes), sets embedded, keyed by `workoutId+itemKey`; `exerciseId` copied for history. Auth helpers `convex/access.ts` (gym staff = `gymMembers.staff`).
- Attendance = `bookings` (status signedIn), one per member per date; Wodify import writes one per athlete-day (source wodify), no time slot.
- Wodify import (`convex/wodifyImport.ts`, `#/imports`, admin): performance-results JSON parsed in browser → chunked idempotent upserts (athletes → workouts → memberLogs); imported rows have `source: 'wodify'`, item key `wodify:<norm(component)>`; metcon = section-level score, notes = stripped HTML description; lifts (Component Type Weightlifting) = exercises in one `wodify-strength` section (first), prescriptions from Rep Scheme, logs carry `exerciseId`. Warmups (not in any export) come from the coach app via Claude in Chrome as `wodify_warmups_*.json` → display-only `wodify-warmup` section; day order warmup → strength → rest. Compare docs with `sameData` (Convex sorts keys).
- Client: routes `#/gyms[/:id]`, `#/classes/:id`, `#/library`, `#/workouts[/:id]`, `#/imports`, `#/leaderboard[/:date]`; shared `apps/web/src/features/ui/` (ui.module.css, ErrorBanner, useRun); gym/class pick `features/classes/useClassPick`.
- Leaderboard (`convex/leaderboard.ts`, staff): per class day, Rx first then sortValue by score type `sort`; unclaimed members flagged `signedUp: false` (web only).

## Conventions
- See CLAUDE.md. Each dev has own Convex dev deployment.

## Open decisions
- Test runner (none yet). CI.
- Mobile → Convex: map handoff model (bookings, 1RM, per-type metcon scores) onto workouts/memberLogs; needs Clerk Expo auth. Leaderboard/Menu not designed.
