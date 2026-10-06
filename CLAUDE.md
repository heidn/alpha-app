# CLAUDE.md
Stack: Vite + React (TS) · Convex (backend/DB) · Clerk (auth). Team: 2 devs, parallel work, same repo.
Be terse. Code over prose. No restating the task, no recap of diffs.

## 0. Session start (mandatory)
Memory is auto-injected by the SessionStart hook (`.claude/hooks/start.sh`). If you don't see a `## MEMORY` block above, run `bash .claude/hooks/start.sh` before anything else.
Check "OTHER BRANCHES" in it: if the other dev's branch touches files you're about to edit, STOP and tell the user.

## 1. Memory (mandatory update before finishing any task)
Files in `.claude/memory/`:
- `STATE.md` — shared current truth: architecture, conventions, open decisions. **≤40 lines.** Rewrite/prune, don't append.
- `LOG.md` — append-only, one line each: `YYYY-MM-DD <dev> | what changed | why/gotcha`. Never edit old lines (union-merged in git).
- `dev/<dev>.md` — your private in-progress notes (current task, next step). Only edit your own.
Rules: ≤3 new lines per task. Record decisions, gotchas, schema changes, env/setup changes. Don't record anything derivable from code or `git log`.
Dev id = `$CLAUDE_DEV` or `git config user.name`.

## 2. Two-dev collision rules
- Never work on `main`. Branch: `<dev>/<short-topic>`. One task = one branch = one worktree (`git worktree add ../alpha-app-<topic> -b <dev>/<topic>`).
- Before starting: `git fetch -q` and rebase on `origin/main`. Rebase again before PR.
- Hot files (edit minimally, in small isolated commits, announce in Slack): `convex/schema.ts`, `convex/auth.config.ts`, `convex/http.ts` (if added), `src/main.tsx`, `src/App.tsx`/router, `package.json`, lockfile, `.env*`, `CLAUDE.md`, `.claude/settings.json`.
- Prefer adding new files over editing shared ones (one Convex file per domain: `convex/<domain>.ts`; one component folder per feature: `src/features/<feature>/`).
- Never hand-edit `convex/_generated/**` or lockfile conflicts: regenerate (`npx convex dev --once`, reinstall).
- Each dev uses their OWN Convex dev deployment (never share one). Never run `convex deploy` or touch prod; humans only.
- Schema changes: additive and backward-compatible only (optional fields → backfill → then tighten). Post in Slack before merge.
- Small PRs (<400 lines). Squash merge. Don't reformat files you aren't changing.

## 3. Stack rules
**Convex**
- Every function has `args` validators (`v.*`) and, for queries/mutations on user data, an auth check (`requireUser(ctx)` / `getCurrentUser(ctx)` from `convex/users.ts`).
- Use `withIndex`, never `.filter()` on large tables; no unbounded `.collect()` (use `.take(n)`/pagination).
- Mutations are transactional: keep them small; call external APIs only from `action`s.
- Use `internalQuery/Mutation/Action` for anything not called by the client.
- Client: `useQuery`/`useMutation` from `convex/react`; handle `undefined` (loading) state.
**Clerk + Convex auth**
- Provider order: `ClerkProvider` → `ConvexProviderWithClerk` (use `useAuth`). Clerk "Convex integration" activated (dashboard.clerk.com/apps/setup/convex); `applicationID: "convex"`.
- Server identity only via `ctx.auth.getUserIdentity()`; never accept a userId from client args for authorization.
- Gate UI with Convex's `<Authenticated>/<Unauthenticated>/<AuthLoading>`, not just Clerk's `<SignedIn>` (avoids unauthenticated queries firing).
- Users live in `users` keyed by `identity.tokenIdentifier`; created/refreshed on sign-in by client calling `api.users.store` (`useStoreUser`). No webhook.
**Env**: client vars need `VITE_` prefix (`VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CONVEX_URL`). Server vars (`CLERK_FRONTEND_API_URL`; any future secrets e.g. `CLERK_SECRET_KEY`) live in the Convex dashboard / `.env.local` (gitignored). Never read, print, commit, or paste secrets anywhere (incl. Slack). Template: `.env.example`.
**React/Vite**: function components + hooks, TS strict, no `any`. Colocate component + styles. No new deps without asking.

## 4. Slack (use Slack MCP if present; else print a one-line message for the dev to paste)
Post to the team channel (≤2 lines, link PR/branch) on: task start (+files you'll touch), PR opened, blocked/need decision, schema or auth change merged, anything touching hot files, security advisories, major upgrades.
Never include secrets, user data, or full diffs. Don't post routine progress.
If invoked from Slack: reply in-thread, one short message, then link.

## 5. Security & dependencies (repo must stay vulnerability-free and current)
- Touching `package.json`/lockfile → run `npm audit --omit=dev` before finishing. No unresolved high/critical. Never `npm audit fix --force` without asking.
- "Latest safe" = latest stable (no prerelease/canary) that passes audit + `tsc` + build + tests. Skip versions <7 days old unless fixing a CVE.
- Check `npm outdated` when starting dependency work. Patch/minor: one dedicated PR (`chore/deps-*`), never mixed into feature PRs. Major: its own PR, read the changelog, note breaking changes in LOG.
- Upgrade families together: `react`+`react-dom`+types; `convex`+`@convex-dev/*`; `@clerk/*`; `vite`+`@vitejs/*`.
- New dep: justify in the PR (maintained, no open advisories, not replaceable in <30 lines). Prefer fewer deps. Use `npm ci` in CI/fresh installs.
- Code: no committed secrets or `.env*`; no `eval`/`dangerouslySetInnerHTML` without sanitizing; validate all Convex args; verify webhook signatures; no user-supplied URLs fetched server-side without an allowlist.
- Found a vulnerability you can't fix now → LOG it, post in Slack, don't ignore it.

## 6. Token efficiency
- Don't read: `node_modules`, `convex/_generated`, `package-lock.json`, `dist`, `.git`, `prompts/`. Don't `cat` big files.
- `grep`/glob first, then read line ranges. Read a file once per task.
- Trust STATE.md over re-exploring the repo. If STATE.md is wrong, fix it.
- Run only relevant checks: `npm run typecheck`, `npx oxlint <changed files>`, targeted tests. No full-repo runs unless asked.
- Batch edits per file. No explanatory comments on obvious code. Final answer ≤5 lines: what changed, what to check.
- Long task or context filling: update `dev/<dev>.md` then suggest `/compact` or a fresh session.

## 7. Definition of done
Typechecks · lint clean on changed files · `npm audit` clean if deps changed · memory updated (§1) · Slack posted if §4 applies · branch pushed, rebased on main.
