# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CarsTrack — a multi-tenant fleet management SaaS (Next.js App Router + Supabase). UI copy, code comments, and commit messages are in Turkish; keep new user-facing text and comments in Turkish to match the existing codebase.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint
npx tsc --noEmit # type-check (no separate typecheck script)
```

There is no test suite/framework configured in this repo.

## Architecture

### Data access has two paths — know which one you're in

- **`src/lib/db.ts`** (~2000 lines) is the primary data layer, called directly from client components. It queries Supabase from the browser using the anon key, relying on RLS policies for tenant isolation. It also has a 5-minute in-memory TTL cache (`dataCache`) keyed by string prefixes, busted via `bustCache(prefix)` after writes — when adding a new read/write pair here, remember to bust the right cache prefix.
- **`src/app/api/**/route.ts`** are used where server-side logic is required: notification dispatch (push/email/in-app), cron jobs, admin-privileged operations, and file/document processing. These use `src/lib/supabase/server.ts` (cookie-based, RLS-respecting) or `src/lib/supabase/admin.ts` (service-role key, bypasses RLS — use only for cross-tenant/system operations like cron jobs).

All three Supabase client constructors live under `src/lib/supabase/`: `client.ts` (browser), `server.ts` (server components/route handlers, cookie-based), `admin.ts` (service role, no RLS). Don't create ad-hoc Supabase clients elsewhere.

Database rows are `snake_case`; app-level types (`src/lib/types.ts`) are `camelCase`. Mapper functions (e.g. `toVehicle` in `db.ts`) convert between the two — API routes that return data to the frontend do their own inline row→camelCase mapping, so schema changes typically need updates in both `db.ts` mappers and any API route touching that table.

### Multi-tenancy and auth

- Every table is scoped by `company_id`; tenant isolation is enforced by Postgres RLS policies (see `supabase/migrations/`, especially the `2026061*` and `2026070*` "security_hardening"/"rls_*" migrations).
- `requireCompanyId()` in `db.ts` resolves the current user's company id client-side, in order: cached value → `user_metadata.company_id` (fast path) → `/api/auth/profile` fallback, which then back-fills metadata for future calls. Any new client-side data function should call this rather than re-deriving company id.
- `src/context/auth-context.tsx` owns `user`/`profile`/`company` state app-wide via `onAuthStateChange`, and unblocks the UI using `user_metadata.company_id` before the full profile row has loaded — the full `Profile`/`Company` load happens in the background and patches in.
- Roles (`UserRole` in `types.ts`): `manager`, `operator`, `user` (driver). Plans (`PlanType`): `free`, `pro`, `fleet` — gate feature access via `src/lib/plans.ts`.

### Notifications

`src/lib/notify.ts` (`dispatchToManagers` / `NotifyEvent`) is the single fan-out point for events, sending to three channels: in-app (`notifications` table, always sent), Web Push (`src/lib/push.ts`), and email (`src/lib/notify-email.ts`, via Resend). Event types map to a category (`operational` | `reminders`) in `EVENT_CATEGORY`, which per-user `notification_prefs` can opt out of for push/email only — the in-app bell always fires. `EVENT_COOLDOWN_MINUTES` suppresses repeat push/email for noisy event types within a short window. When adding a new notification-worthy event, add its type to `EVENT_CATEGORY` (and `EVENT_COOLDOWN_MINUTES` if it can fire in bursts) rather than inventing a parallel dispatch path.

### Cron jobs

Defined in `vercel.json`, implemented under `src/app/api/cron/*/route.ts`, protected by `CRON_SECRET` bearer auth: `fleet-alerts`, `license-alerts`, `kilometer-reminder`, `keepalive`, `db-backup`. `db-backup` runs daily and is the project's only backup mechanism (Supabase free tier has none) — see `docs/DATABASE_BACKUP.md` for how it works and how to restore. When adding a table, add it to `BACKUP_TABLES` in `src/app/api/cron/db-backup/route.ts` or it silently won't be backed up.

### Database migrations

Plain numbered SQL files in `supabase/migrations/` (`YYYYMMDD[a-z]_description.sql`), applied via Supabase directly — there's no local migration-generation CLI workflow captured in this repo. Read recent migrations before writing a new one to match the existing RLS/security patterns (`SECURITY DEFINER` functions live in a `private` schema; see the `2026061*` migrations).

### i18n

`src/lib/i18n.ts` + `src/context/language-context.tsx` provide translations, but the product is Turkish-first — most UI strings are written directly in Turkish rather than routed through the i18n layer.

## Environment

Required env vars (see `.env.local`, not committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FEEDBACK_INBOX_EMAIL`, `CRON_SECRET`, `VAPID_PRIVATE_KEY`/`NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_SUBJECT` (web push), `ANTHROPIC_API_KEY`/`GOOGLE_AI_API_KEY` (document extraction), `NEXT_PUBLIC_APP_URL`.

## Demo account

`scripts/seed-demo-account.mjs` seeds a full demo tenant ("Demo Filo A.Ş.") into the live Supabase project for sales/demo purposes, isolated from real company data. It refuses to run if a company with that name already exists. See `DEMO_HESAPLAR.md` (gitignored, contains credentials) for login details and content summary.
