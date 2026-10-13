# AGENTS.md

CarsTrack — multi-tenant fleet management SaaS. Next.js App Router + Supabase.

`CLAUDE.md` is the detailed architecture map; `docs/ADMIN_PANEL.md`, `docs/DATABASE_BACKUP.md` cover subsystems. Read those before deep work. This file is the fast ramp-up + gotchas.

## Commands

```bash
npm run dev            # localhost:3000
npm run build
npm run start
npm run lint           # eslint only
npx tsc --noEmit       # type-check — there is NO npm typecheck script
```

There is **no test suite/framework**. Verify changes with `lint` + `npx tsc --noEmit` (and `build` if wiring changes).

Verification policy: do not use a browser or claude-in-chrome unless explicitly asked; verify via terminal commands.

## Language / style

- UI copy, code comments, and commit messages are **Turkish**. Keep new user-facing text and comments Turkish too.
- Do not add comments unless asked.

## Stack quirk (important)

Next.js 16 + React 19 + Tailwind 4 — this is newer than most training data. Before writing framework code, read the relevant guide in `node_modules/next/dist/docs/`. `next dev` writes/rewrites a block in `CLAUDE.md` (BEGIN/END `nextjs-agent-rules`); don't try to remove it.

## Architecture: two data paths — know which one

- `src/lib/db.ts` (~3000 lines) — primary data layer called directly from **client components** using the anon key + RLS. Has a 5-minute in-memory TTL cache keyed by string prefix; after a write, call `bustCache(prefix)` with the right prefix or reads go stale.
- `src/app/api/**/route.ts` — server logic only: notifications, crons, admin, file/document processing. Uses `src/lib/supabase/server.ts` (cookie/RLS) or `src/lib/supabase/admin.ts` (service role, bypasses RLS — cross-tenant/system only).

Supabase clients live only in `src/lib/supabase/` (`client.ts`, `server.ts`, `admin.ts`). Never construct ad-hoc clients elsewhere.

DB rows are `snake_case`; app types (`src/lib/types.ts`) are `camelCase`. Mappers (e.g. `toVehicle` in `db.ts`) convert. API routes that return data do their own inline row→camelCase mapping — schema changes usually need edits in both `db.ts` mappers and any route touching that table.

## Multi-tenancy / auth

- Every table is scoped by `company_id`; isolation is enforced by Postgres RLS (see `supabase/migrations/2026061*`, `2026070*`).
- Client-side data functions must resolve company id via `requireCompanyId()` in `db.ts` (cached → `user_metadata.company_id` → `/api/auth/profile`), not re-derive it.
- Roles (`types.ts`): `manager`, `operator`, `user` (driver). No plan/billing tiers — removed 2026-09-25; product is free ("ücretsiz").

## Notifications

`src/lib/notify.ts` (`dispatchToManagers` / `NotifyEvent`) is the single fan-out point: in-app + Web Push + email. Add new event types to `EVENT_CATEGORY` (and `EVENT_COOLDOWN_MINUTES` if bursty) rather than building a parallel dispatch path.

## Admin console (`/admin`) & crons

- `/admin` auth is env-based (`ADMIN_EMAILS`), never in the DB. Three gates: `src/proxy.ts` JWT decode (fast, not a security boundary), `src/app/admin/layout.tsx` `getUser()`, and `withAdmin()` on every `/api/admin/*` route. Service-role client only inside that wrapper.
- Every mutating admin action must call `logAdminAction()`. Admin tables are service-role-only and every consumer must degrade gracefully if the relevant migration isn't applied.
- Crons live in `vercel.json` AND `src/lib/admin/crons.ts` (hand-mirrored, doubles as trigger allow-list) — add to **both**. Wrap each `GET` in `withCronLogging()`.
- `db-backup` is the only backup mechanism; add every new table to `BACKUP_TABLES` in `src/app/api/cron/db-backup/route.ts` or it won't be backed up.

## Migrations

Plain numbered SQL in `supabase/migrations/` (`YYYYMMDD[a-z]_description.sql`), applied manually via Supabase — no local migration CLI. Read recent migrations first to match the `SECURITY DEFINER` / `private` schema / RLS patterns.

## Misc

- Env vars needed in `.env.local` (not committed): see `CLAUDE.md` "Environment". Missing `NEXT_PUBLIC_SUPABASE_URL`/`..._ANON_KEY` breaks everything.
- Demo tenant is currently removed. `scripts/seed-demo-account.mjs` recreates it and refuses to run if a company with that name exists.
- `DEMO_HESAPLAR.md` (gitignored) holds demo credentials.
