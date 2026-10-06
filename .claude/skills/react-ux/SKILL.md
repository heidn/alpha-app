---
name: react-ux
description: UX/visual conventions for this React app. Load before building or restyling any page, component, form, table, or navigation in src/.
---

# React UX conventions (Alpha Strength)

## Stack constraints
- Plain CSS: global tokens in `src/index.css`, per-component **CSS Modules** colocated (`Foo.tsx` + `Foo.module.css`). No UI/CSS libs without asking.
- Routing: tiny hash router `src/features/shell/useRoute.ts` (`#/`, `#/admin`). Add routes in `AppShell.tsx`.
- Auth UI: Clerk components (`SignInButton`, `SignUpButton`, `UserButton`) inside Convex `<Authenticated>/<Unauthenticated>/<AuthLoading>`.

## Design tokens (use vars, never raw hex in modules)
- Color: `--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-contrast`, `--accent-soft`, `--danger`, `--danger-soft`. Role colors: `--role-admin`, `--role-coach`, `--role-athlete`.
- Space: 4px scale `--s-1`..`--s-8`. Radius: `--r-sm` (6) `--r-md` (10) `--r-lg` (16). Shadow: `--shadow-sm`, `--shadow-md`.
- Light + dark both defined via `prefers-color-scheme`; check both.

## Layout
- Shell: sticky top nav (brand left, links, `UserButton` right) + `main` max-width `--content-w` (1120px), 16px side gutter on mobile.
- Page = `<h1>` title + one-line subtitle, then content cards. One primary action per view.
- Must work at 360px width: no horizontal page scroll; wide tables scroll inside their own container.

## Every data view handles 4 states
1. Loading (`useQuery` → `undefined`): skeleton or muted "Loading…", keep layout stable.
2. Empty: short sentence + next action.
3. Error: `ConvexError` → show `err.data` in an inline `role="alert"` banner, dismissible. Never show raw stack text.
4. Success: data. Mutations give feedback (disabled while pending, brief "Saved").

## Accessibility
- Semantic elements (`nav`, `main`, `table`, `button`); every input labelled (visually hidden ok).
- Visible `:focus-visible` ring (`--accent`). Contrast ≥ 4.5:1. Don't rely on color alone (badges have text).
- Disabled controls get a `title` explaining why.

## Copy
- Sentence case, short, human. Role names capitalized in UI (Admin, Coach, Athlete).

## Security
- UI gating is cosmetic; every Convex function enforces roles server-side (`requireRole`).
