# heidnick
- Current: wod-* PR series (plan: ~/.claude/plans/vivid-cuddling-squid.md). Worktree ../alpha-app-wod. PR1 heidnick/wod-schema done; next wod-gyms (router params, gyms.ts, Gyms pages).
- Worktree has no .env.local (deny rule blocks copy): run `npx convex dev --once` from a checkout with env.
- "Signed in as Member": Convex identity lacks name/email; add claims in Clerk session token (Customize session token).
- @clerk/clerk-react deprecated → @clerk/react (major); needs its own chore/deps PR.
