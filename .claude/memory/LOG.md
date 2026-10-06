# LOG (append-only: YYYY-MM-DD <dev> | what changed | why/gotcha)
2026-10-06 heidnick | repo scaffold: Vite+React TS, Convex, Clerk, `users.store` on sign-in, Claude memory/hooks | Clerk has no JWT template/webhook step anymore: activate Convex integration, env `CLERK_FRONTEND_API_URL`
2026-10-06 heidnick | added SignOutButton (useClerk().signOut) in features/auth, shown in App when Authenticated | scaffold still uncommitted on main; branched in place, no worktree
2026-10-06 heidnick | stripped scaffold: template CSS, unused users.clerkId+index, node types in app tsconfig | existing dev users rows with clerkId fail schema push: delete them in Convex dashboard (recreated on sign-in)
2026-10-06 heidnick | roles admin/coach/athlete: optional users.role, convex/admin.ts (listUsers paginated, setRole), admin page | bootstrap first admin with `npx convex run admin:grantAdmin '{"userId":"..."}'`; admins can't demote themselves
2026-10-06 heidnick | seed:testUsers (1 coach, 5 athletes, `test|` tokenIdentifiers); UI shell: login/home/nav/admin, react-ux skill, hash router + CSS modules | ui-shell stacked on heidnick/roles; dropped SignOutButton/CurrentUser (UserButton handles sign-out)
