# Architecture & Phasing Notes

## Tech stack decision (solo/small-team build)

**Mobile: React Native (Expo), not Flutter or native Swift/Kotlin.**
A solo/small team building three interlocking features (live data, payments,
real-time presence) benefits most from one codebase for iOS + Android and a
huge library ecosystem for exactly the hard parts here: maps
(`react-native-maps`), geofencing (`expo-location` + `expo-task-manager` for
background region monitoring), push (`expo-notifications`), and Stripe
(`@stripe/stripe-react-native`, official SDK). Flutter is a reasonable
alternative and its geofencing/background-location story is fine, but the
team's leverage (TypeScript end-to-end, sharing types with the backend) and
the maturity of RN's dating/social-app-adjacent libraries (needed for Phase 3)
tip it to RN. Native Swift/Kotlin gives the most control over background
geofencing precision (relevant for Here Now) but doubles build cost for a
three-phase roadmap — not worth it before there's traction. If Here Now's
background geofencing precision turns out to be inadequate in Expo's managed
workflow, the fallback is ejecting to a bare RN workflow (or writing a small
native module) for that feature specifically — not a full rewrite.

**Backend: Supabase (Postgres + PostGIS + Auth + Realtime + Storage), plus a
thin Express service for logic that must not run on the client.**
The brief's own suggestion — "Supabase/Firebase for MVP speed, with a
migration path to a dedicated backend" — is the right call for a solo build.
Supabase gives you Postgres+PostGIS (geospatial queries), phone-auth,
row-level security, Realtime (for live wait-time updates and, later, Here Now
presence) and Storage (report photos) with no infra to run. The escape hatch
that keeps this from becoming a dead end: **no business logic lives only in
client code that talks directly to Supabase.** Report ingestion, geofence
verification, and reliability scoring all go through `apps/api` (Express),
which is the only thing with the Supabase *service role* key. That keeps a
clean seam to swap Supabase's Postgres for a self-hosted instance, or replace
Supabase Auth with something else, later — you're migrating one Postgres
database and one thin API layer, not rewriting business logic scattered
across client code.

**Database: Postgres + PostGIS** (via Supabase) — required for the
geofencing/distance queries in the brief (ST_DWithin, ST_Distance).

**Real-time**: Supabase Realtime (Postgres logical replication over
WebSockets) for live wait-time updates. Same mechanism will carry Here Now
presence in Phase 3 — no new real-time infra needed later.

**Auth**: Supabase Auth with phone (SMS OTP) as the primary factor — see
"Auth model anticipates Phase 3" below.

**Payments** (Phase 2): Stripe, as suggested. Not implemented yet.

**Maps**: `react-native-maps` (Google Maps provider on Android, Apple Maps on
iOS) — no Mapbox subscription needed for Phase 1's pin-and-list use case.
Revisit if custom map styling or offline tiles become a requirement.

## Data model — what exists now vs. what's stubbed for later

### Phase 1 (built now)

- `venues` — id, name, address, `geog` (PostGIS `geography(Point)`),
  category, hours, cover_charge_info, `is_fast_pass_partner` (bool, unused
  until Phase 2 but added now so Phase 1 UI can already branch on it without
  a later migration).
- `line_reports` — id, venue_id, user_id, wait_estimate_minutes, crowd_level
  (enum), note, media_url, geofence_verified, created_at.
- `reporter_scores` — user_id, accuracy_score, reports_submitted, updated_at.
- `profiles` — extends Supabase `auth.users` with fields Phase 1 doesn't
  enforce yet but Phase 3 will need (see below), so no destructive migration
  is needed to add them later.

### Phase 2 TODOs (Fast Pass) — tables stubbed, commented out in
`supabase/migrations/0002_phase2_fastpass_stub.sql`

- `subscriptions` (user_id, tier, status, stripe_subscription_id,
  renewal_date, passes_remaining)
- `fast_pass_redemptions` (id, user_id, venue_id, qr_token, redeemed,
  redeemed_by_staff_id, created_at)
- `venue_partner_agreements` (venue_id, nightly_pass_cap, blackout_rules
  jsonb, revenue_share_terms jsonb)
- Open business decision (flagged in brief, not an engineering one): whether
  venues get a Stripe Connect revenue share or Fast Pass is a pure
  user-paid perk. This changes whether `venue_partner_agreements` needs a
  `stripe_connect_account_id` column — deferred until that's decided.
- Staff-side redemption view: brief says a full staff app isn't needed at
  small scale (photo ID check + timestamp is enough). When it is needed,
  it's a thin web view reading `fast_pass_redemptions`, not a native app.

### Phase 3 TODOs (Here Now) — tables stubbed, commented out in
`supabase/migrations/0003_phase3_here_now_stub.sql`

- `venue_presence` (user_id, venue_id, checked_in_at, expires_at,
  geofence_verified, visible) — `visible` must default to `false` and be
  session-scoped (never a persistent opt-in) per the brief's safety
  requirement; this default is enforced at the DB level (`DEFAULT false`,
  no upsert path that flips it without an explicit user action) so it can't
  be silently changed by a future code change.
- `matches` (user_a_id, user_b_id, venue_id, matched_at, chat_expires_at)
- `reports` (reporter_id, reported_id, venue_id, reason, status) — real
  moderation queue, not a black hole; needs a moderation dashboard, out of
  scope for this repo until Phase 3 starts.
- `age_verifications` (user_id, verified, verification_method, verified_at)
  — ID verification via Persona or Stripe Identity, not just a birthdate.

**Why `profiles` already has `phone_verified_at` and placeholder
`age_verification_status` columns in Phase 1**: adding NOT NULL / enforced
columns to a table with live user rows later is painful (backfill,
migration coordination with the mobile app's auth flow). Adding nullable
columns now that Phase 1 doesn't enforce, and turning on enforcement (a
NOT NULL constraint, a check in the API's auth middleware) in Phase 3, is a
config change, not a schema rebuild. Phone verification is Supabase Auth's
default flow already, so `phone_verified_at` is populated from day one;
`age_verification_status` stays `'unverified'` and unenforced until Phase 3
wires up an ID verification provider.

**Standalone vs. third-party dating API integration (Here Now)**: confirmed
standalone in-app system is correct. Tinder/Bumble/Hinge do not expose public
APIs for third-party proximity matching — there's no integration path to
architect around. Here Now is a fully separate matching/chat system scoped
to `venue_presence` rows, built as its own feature in Phase 3.

## Weighted scoring algorithm (Phase 1)

Implemented in `apps/api/src/scoring/weightedScore.ts`. Not a flat average:

- Each report's weight decays exponentially with age (half-life ~20 minutes
  for wait time, since lines change fast).
- Each report's weight is multiplied by the reporter's current
  `accuracy_score` (0–1), so low-reliability reporters are down-weighted,
  never hard-excluded (avoids a cold-start problem for new users and avoids
  visibly flagging anyone as "unreliable").
- `accuracy_score` itself is updated by a scheduled job (not built yet —
  flagged as a TODO in `apps/api/src/scoring/reliabilityJob.ts`) that
  compares a reporter's past reports against the consensus of concurrent
  reports at the same venue.

## Geofencing (~500 ft)

Client-side check (`apps/mobile/src/lib/geofence.ts`) using
`expo-location` gives immediate UI feedback ("you're too far to report").
Server-side check (`apps/api/src/geofence/verify.ts`) using PostGIS
`ST_DWithin` on the coordinates submitted with the report is the actual
source of truth — the client check is trivially spoofable (mock GPS apps),
so `line_reports.geofence_verified` is only ever set `true` by the API after
its own independent distance check, never trusted from the client payload.

## CI

`.github/workflows/ci.yml` runs typecheck + lint across all workspaces on
every push/PR. Test suites are not built out yet (Phase 1 has none) — add
Jest to `apps/api` first (pure functions: scoring, geofence math) since
those are the highest-value/lowest-effort tests to add next.

## What's actually been verified (not just typechecked)

This scaffold has been run against real infrastructure, not just compiled:

- Every migration (`0001`-`0003`) applied cleanly to a real local
  Postgres 16 + PostGIS instance with no errors.
- `is_within_geofence` (the server-side source of truth for report
  submission) was tested against real coordinates: true when standing at
  a venue, false 3,000 miles away, and false at ~222m from a venue (just
  outside the ~152m/500ft radius) -- confirming the boundary is where the
  code claims it is, not just that the function runs.
- A full report submission was inserted end-to-end (report row +
  `reporter_scores` upsert via `increment_reports_submitted`) and the
  real `computeWeightedVenueStatus` function, run directly against that
  data via a live Postgres connection, produced the expected crowd level,
  wait estimate, and confidence score.
- The mobile app's entry point had a real bug this verification caught:
  Expo's default `main: node_modules/expo/AppEntry.js` doesn't resolve
  under npm workspaces, since `expo` gets hoisted to the repo root's
  `node_modules` instead of `apps/mobile/node_modules`. Fixed by using
  `registerRootComponent` in `apps/mobile/index.ts` directly (Expo's
  documented pattern for monorepos) instead of relying on the default
  entry. Confirmed fixed by actually running `expo export` and getting a
  bundle (795 modules resolved) instead of a `ConfigError`.

What's still *not* verified, because it requires infrastructure only the
project owner can provision (see "Open questions" below): a real Supabase
project (this sandbox has no Docker, so `supabase start`'s full stack --
PostgREST + GoTrue + Realtime together -- was never run; only the
underlying Postgres+PostGIS layer was), and the app running on an actual
device or simulator.

## Open questions for the product owner

These were called out in the original brief as things to clarify before
writing code. Reasonable defaults were chosen so a working Phase 1 scaffold
could ship immediately; flagging them explicitly rather than silently
deciding:

1. **Launch city?** Set to New York, NY (changed from an earlier Boston
   default -- NYC was judged the more realistic launch market).
   `supabase/seed.sql` now seeds nine real, currently-operating venues
   (Lower East Side/East Village bars and clubs, plus Manhattan/Brooklyn
   restaurants actually known for real walk-in waits -- Carbone, Via
   Carota, Peter Luger) with real addresses, researched via web search.
   Still not launch-ready: coordinates are approximate (derived from
   street addresses, not surveyed), hours/cover charges are illustrative
   and unconfirmed, and none of these venues have actually agreed to be
   in the app -- real venue partnerships (required for Fast Pass in
   particular) are a business development step, not something a seed
   file can stand in for.
2. **Budget for third-party services?** Supabase, Mapbox/Google Maps, Stripe
   Identity, Persona, Twilio (if SMS volume outgrows Supabase Auth's
   built-in provider) all have free tiers sufficient for Phase 1 testing,
   but Phase 3's ID verification (Persona/Stripe Identity) charges per
   verification — worth budgeting before Phase 3 starts, not at launch.
3. **Cross-platform vs. native?** Went with Expo/React Native per the
   solo-build tradeoff above. Revisit only if Here Now's background
   geofencing precision proves inadequate in the managed workflow.
