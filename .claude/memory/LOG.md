# LOG (append-only: YYYY-MM-DD <dev> | what changed | why/gotcha)
2026-10-06 heidnick | repo scaffold: Vite+React TS, Convex, Clerk, `users.store` on sign-in, Claude memory/hooks | Clerk has no JWT template/webhook step anymore: activate Convex integration, env `CLERK_FRONTEND_API_URL`
2026-10-06 heidnick | added SignOutButton (useClerk().signOut) in features/auth, shown in App when Authenticated | scaffold still uncommitted on main; branched in place, no worktree
2026-10-06 heidnick | stripped scaffold: template CSS, unused users.clerkId+index, node types in app tsconfig | existing dev users rows with clerkId fail schema push: delete them in Convex dashboard (recreated on sign-in)
