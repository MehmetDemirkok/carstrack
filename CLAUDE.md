# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (Next.js 16)
npm run build    # Production build
npm run lint     # ESLint (no test suite exists)
```

## Environment

Requires `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # admin client only
```

## Architecture

**CarsTrack** is a Turkish-language personal fleet maintenance tracker. UI language is Turkish throughout.

### Data Layer — two parallel implementations

There are **two separate data modules** and it's important not to mix them:

- `src/lib/db.ts` — async Supabase CRUD (used by most pages after auth). Maps between camelCase TypeScript types and snake_case DB columns via `toVehicle`/`toDbVehicle`/`toRecord` mappers.
- `src/lib/store.ts` — synchronous localStorage CRUD with seed data (used by the dashboard `src/app/page.tsx` which skips auth). Also owns all business logic: `calculateHealthScore`, `getFleetAlerts`, `getMaintenanceStatusForItem`, `getMaintenanceProgress`.

Pages that require auth import from `src/lib/db.ts`; the unauthenticated dashboard imports from `src/lib/store.ts`.

### Auth

- Supabase Auth via `@supabase/ssr`. Three client factories: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (RSC/server actions), `src/lib/supabase/admin.ts` (service role).
- `src/middleware.ts` protects all routes except `/login`, `/register`, and Next.js internals. Redirects unauthenticated users to `/login` and authenticated users away from auth pages.
- `src/context/auth-context.tsx` provides `useAuth()` — exposes `{ user, profile, company, loading, signOut }`. `profile` includes the user's `role: "manager" | "driver"` and `companyId`. Multi-tenant: all data is scoped by `company_id`.

### Domain model (`src/lib/types.ts`)

Core types: `Vehicle`, `ServiceRecord`, `FleetAlert`, `MaintenanceItem`. Supporting enums are all Turkish strings (`FuelType`, `TransmissionType`, `TireSeasonType`). Health scores (0–100) are computed from insurance/inspection expiry dates (15% each) and maintenance item progress (70% combined).

### Routing (App Router)

| Route | Purpose |
|---|---|
| `/` | Dashboard — fleet health score, alerts, upcoming maintenance |
| `/vehicles` | Vehicle list with multi-select delete |
| `/vehicles/new` | Add vehicle form |
| `/vehicles/[id]` | Vehicle detail + service history + edit |
| `/history` | Full service record log |
| `/analytics` | Charts (Recharts) |
| `/settings` | User/company settings |
| `/users` | Driver management (manager role) |

### Layout

`src/app/layout.tsx` sets up a persistent shell: `<Sidebar>` (desktop, 64px offset), `<TopBar>`, `<BottomNav>` (mobile). Max content width is `max-w-5xl`. The app is a PWA (`public/manifest.json`).

### UI Components

`src/components/ui/` contains shadcn components backed by `@base-ui/react`. Add new shadcn components with `npx shadcn add <component>` (config in `components.json`). Styling uses Tailwind v4 + `tw-animate-css`. Framer Motion is used for page/card animations.