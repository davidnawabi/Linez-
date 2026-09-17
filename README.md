# Linez — Nightlife Line Tracker

The nightlife super-app: Phase 1 (crowdsourced, geofence-verified live wait
times and crowd levels for bars, clubs, and restaurants) and Phase 2
(Fast Pass, a paid skip-the-line subscription) are built. Here Now (Phase 3)
is not — see [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the phased plan and
the schema/auth decisions made now so it doesn't require a rebuild.

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

## What's implemented in Phase 2 (Fast Pass)

- `Subscription`, `VenuePartnerAgreement`, and `FastPassRedemption` tables
- Stripe Checkout for the monthly subscription tier, and a webhook handler
  that keeps `subscriptions` in sync (this needs your own Stripe test-mode
  keys to actually run — see `apps/api/.env.example`)
- Fast Pass issuance enforces a venue's nightly cap and blackout dates, and
  blocks a user from holding two pending passes at the same venue at once
  — all checked server-side against the database, never trusted from the
  client
- No staff app: door verification is a no-login web page reached by
  scanning the pass's own QR code (`GET/POST /fast-pass/redeem/:token`) —
  the smallest version of the brief's "lightweight staff view," not a
  first cut at a real one

## What's explicitly deferred

See `ARCHITECTURE.md` → "Phase 2" and "Phase 3 TODOs" for what's stubbed
in the schema now (Here Now tables, age/ID verification columns, Stripe
Connect revenue share, the `credit_pack` subscription tier) versus what
still needs real design work later.
