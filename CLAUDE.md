# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CarsTrack — a multi-tenant fleet management SaaS (Next.js App Router + Supabase). UI copy, code comments, and commit messages are in Turkish; keep new user-facing text and comments in Turkish to match the existing codebase.

## Verification policy

Kod değişikliklerinden sonra tarayıcıda doğrulama yapma. Ben açıkça istemedikçe claude-in-chrome araçlarını veya yerleşik tarayıcıyı kullanma. Doğrulama gerekiyorsa bunu terminal komutlarıyla (test, build, lint) yap.

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
- Roles (`UserRole` in `types.ts`): `manager`, `operator`, `user` (driver). There is no plan/billing tier: the plan system was removed on 2026-09-19 because every gate returned `true` and no payment integration exists. The `companies.plan` column still exists in the database but nothing in the app reads or writes it.

### Notifications

`src/lib/notify.ts` (`dispatchToManagers` / `NotifyEvent`) is the single fan-out point for events, sending to three channels: in-app (`notifications` table, always sent), Web Push (`src/lib/push.ts`), and email (`src/lib/notify-email.ts`, via Resend). Event types map to a category (`operational` | `reminders`) in `EVENT_CATEGORY`, which per-user `notification_prefs` can opt out of for push/email only — the in-app bell always fires. `EVENT_COOLDOWN_MINUTES` suppresses repeat push/email for noisy event types within a short window. When adding a new notification-worthy event, add its type to `EVENT_CATEGORY` (and `EVENT_COOLDOWN_MINUTES` if it can fire in bursts) rather than inventing a parallel dispatch path.

### Super-admin console (`/admin`)

A cross-tenant console for the app owner only, living beside the tenant app but sharing none of its plumbing — see `docs/ADMIN_PANEL.md` for the full map.

- **Authorization is env-based, never in the database**: `ADMIN_EMAILS` (comma-separated; falls back to `FEEDBACK_INBOX_EMAIL`). Three independent gates enforce it: `src/proxy.ts` decodes the JWT `email` claim for a fast redirect (unsigned — *not* a security boundary), `src/app/admin/layout.tsx` verifies via `getUser()` and `notFound()`s non-admins, and every `/api/admin/*` route wraps itself in `withAdmin()` from `src/lib/admin/api.ts`. The service-role client is only ever constructed inside that wrapper.
- `/admin` is listed in `AUTH_PATHS` in `shell-wrapper.tsx` so the tenant shell doesn't render underneath the console's own shell.
- **Every mutating action writes to `admin_audit_log`** via `logAdminAction()`; broadcast emails also write `admin_email_log`. Both tables are service-role-only (RLS on, no policies) and both writes fail silently if the migration hasn't been applied — the panel still works without them.
- Broadcast email goes through `sendAdminBroadcastEmail` in `sendEmail.ts` (one call per recipient, rate-limit chunked), with segments resolved by `src/lib/admin/recipients.ts`. It honours `profiles.notify_by_email` unless the caller explicitly sets `ignoreOptOut`.
- `src/lib/admin/crons.ts` mirrors `vercel.json` by hand and doubles as the allow-list for manually triggering cron jobs from `/admin/system` — add a new cron to both files.
- Every cron's `GET` is wrapped in `withCronLogging()` from `src/lib/cron/record.ts`, which records the run in `cron_runs` without touching the handler body; `/admin/system` reads it back as per-job health. Wrap new crons the same way.
- The second migration (`20260919_admin_panel_v2.sql`) adds `cron_runs`, `admin_notes`, `admin_email_queue`, `app_settings` and the two storage-weight views. Every consumer degrades gracefully if it hasn't been applied — keep it that way.
- User/company list filtering and sorting happen **in memory** because email and `last_sign_in_at` live in `auth.users` while everything else lives in `profiles`/`companies`, and PostgREST can't join them. Revisit with a SQL view if the user count reaches five figures.

### Cron jobs

Defined in `vercel.json`, implemented under `src/app/api/cron/*/route.ts`, protected by `CRON_SECRET` bearer auth: `fleet-alerts`, `license-alerts`, `keepalive`, `db-backup`, `activation-nudge`, `email-queue-drain`. (`kilometer-reminder` kaldırıldı — haftalık km maili artık yok.) `db-backup` runs weekly (Monday 03:00 UTC / 06:00 Turkey time) and is the project's only backup mechanism (Supabase free tier has none) — see `docs/DATABASE_BACKUP.md` for how it works and how to restore. When adding a table, add it to `BACKUP_TABLES` in `src/app/api/cron/db-backup/route.ts` or it silently won't be backed up. `activation-nudge` (Tue/Fri) is the only cron that fires on the *absence* of data: it emails account managers whose company has no vehicles, or has vehicles but no insurance/inspection dates — those accounts never trigger any other cron, so without it they receive nothing at all. It reuses `email_notification_log` for dedup (capped at 3 sends, 14 days apart) and supports `?dry=1` to preview recipients without sending. (`weekly-admin-report` was removed on 2026-09-19 — the `/admin` console shows the same digest on demand.)

### Database migrations

Plain numbered SQL files in `supabase/migrations/` (`YYYYMMDD[a-z]_description.sql`), applied via Supabase directly — there's no local migration-generation CLI workflow captured in this repo. Read recent migrations before writing a new one to match the existing RLS/security patterns (`SECURITY DEFINER` functions live in a `private` schema; see the `2026061*` migrations).

### i18n

`src/lib/i18n.ts` + `src/context/language-context.tsx` provide translations, but the product is Turkish-first — most UI strings are written directly in Turkish rather than routed through the i18n layer.

## Environment

Required env vars (see `.env.local`, not committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FEEDBACK_INBOX_EMAIL`, `ADMIN_EMAILS` (super-admin console access), `CRON_SECRET`, `VAPID_PRIVATE_KEY`/`NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_SUBJECT` (web push), `ANTHROPIC_API_KEY`/`GOOGLE_AI_API_KEY` (document extraction), `NEXT_PUBLIC_APP_URL`.

## Demo account

**The demo tenant is currently removed** (deleted 2026-09-17: its 6 auth users had already been deleted at some point, which cascade-wiped the profiles/tasks/assignments and left an orphaned husk nobody could log into). Nothing in the app references it.

`scripts/seed-demo-account.mjs` recreates it from scratch ("Demo Filo A.Ş.", ~50 vehicles, service history, documents) against the live Supabase project, isolated from real company data. It refuses to run if a company with that name already exists, so it is safe to re-run now. See `DEMO_HESAPLAR.md` (gitignored, contains credentials) for login details and content summary.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
