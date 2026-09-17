# Linez — Nightlife Line Tracker

Phase 1 of the nightlife super-app: crowdsourced, geofence-verified live wait
times and crowd levels for bars, clubs, and restaurants. Fast Pass (Phase 2)
and Here Now (Phase 3) are not built yet — see [`ARCHITECTURE.md`](./ARCHITECTURE.md)
for the phased plan and the schema/auth decisions made now so those phases
don't require a rebuild.

## Stack

- **Mobile app**: React Native via Expo, TypeScript — `apps/mobile`
- **API**: Node + Express (TypeScript) for logic that must not live on the
  client (weighted scoring, geofence verification) — `apps/api`
- **Database/Auth/Realtime**: Supabase (Postgres + PostGIS, phone-based auth,
  Realtime channels, Storage for report photos) — `supabase/`
- **Shared types**: `packages/shared`

See `ARCHITECTURE.md` for why this stack was chosen over the alternatives.

## Repo layout

```
apps/
  mobile/     Expo app (map + list view, report submission)
  api/        Express service: scoring, geofence verification, report ingest
packages/
  shared/     Types shared between mobile and api
supabase/
  migrations/ SQL migrations (Phase 1 tables + Phase 2/3 stubs, commented out)
  seed.sql    Sample venues for the launch city
```

## Local setup

### Prerequisites

- Node.js 20+
- npm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)
- Expo Go app on your phone, or an iOS/Android simulator, for running `apps/mobile`
- Docker (required by `supabase start` to run Postgres locally)

### 1. Install dependencies

```bash
npm install
```

This installs all workspaces (`apps/mobile`, `apps/api`, `packages/shared`).

### 2. Start Supabase locally

```bash
supabase start
```

This spins up local Postgres (with PostGIS), Auth, Realtime, and Storage, and
prints your local `API URL` and `anon key`.

### 3. Apply migrations and seed data

```bash
supabase db reset
```

This runs everything in `supabase/migrations/` in order and then
`supabase/seed.sql`, which seeds a handful of sample venues for one city so
the map/list views have data to show.

### 4. Configure environment variables

Copy the example env files and fill in the values Supabase printed in step 2:

```bash
cp apps/mobile/.env.example apps/mobile/.env
cp apps/api/.env.example apps/api/.env
```

### 5. Run the API

```bash
npm run dev --workspace apps/api
```

### 6. Run the mobile app

```bash
npm run start --workspace apps/mobile
```

Scan the QR code with Expo Go (or press `i`/`a` for a simulator).

## What's implemented in Phase 1

- `Venue` and `LineReport` tables (PostGIS-backed) and `ReporterScore`
- Geofence verification (must be within ~500 ft of a venue to submit a
  report) — checked both client-side (fast feedback) and server-side
  (source of truth, since client checks are trivially spoofable)
- Weighted wait-time/crowd-level scoring with time-decay, not a flat average
- Map view (pins colored by crowd level) and list view (sorted by distance)
- Report submission flow (wait estimate, crowd level, optional note/photo)

## What's explicitly deferred

See `ARCHITECTURE.md` → "Phase 2 and Phase 3 TODOs" for what's stubbed in
the schema now (Fast Pass tables, Here Now tables, age/ID verification
columns) versus what still needs real design work later.
