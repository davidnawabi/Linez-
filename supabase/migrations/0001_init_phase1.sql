-- Phase 1: Live Line & Wait Tracker
-- Venues, crowdsourced reports, reporter reliability, and a `profiles`
-- table extending auth.users with fields Phase 3 will need enforced later.

create extension if not exists postgis;

-- ---------------------------------------------------------------------
-- profiles
-- Extends Supabase auth.users. phone_verified_at is populated from day one
-- (Supabase Auth's SMS OTP flow). age_verification_status stays
-- 'unverified' and unenforced in Phase 1 -- Phase 3 wires up real ID
-- verification (Persona / Stripe Identity) and starts enforcing it.
-- ---------------------------------------------------------------------
create type age_verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone_verified_at timestamptz,
  age_verification_status age_verification_status not null default 'unverified',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are readable by their owner"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles are editable by their owner"
  on profiles for update
  using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- venues
-- ---------------------------------------------------------------------
create type venue_category as enum ('bar', 'club', 'restaurant');

create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  -- geography(Point) in WGS84 for accurate real-world distance math via
  -- ST_DWithin / ST_Distance (both geofence checks and "sort by distance").
  geog geography(point, 4326) not null,
  category venue_category not null,
  hours jsonb, -- e.g. { "fri": "22:00-02:00", "sat": "22:00-03:00" }
  cover_charge_info text,
  -- Unused until Phase 2, added now so Phase 1 UI/API can branch on it
  -- (e.g. show a "Fast Pass available" badge) without another migration.
  is_fast_pass_partner boolean not null default false,
  created_at timestamptz not null default now()
);

create index venues_geog_idx on venues using gist (geog);
create index venues_category_idx on venues (category);

alter table venues enable row level security;

create policy "venues are publicly readable"
  on venues for select
  using (true);

-- ---------------------------------------------------------------------
-- line_reports
-- geofence_verified is only ever set true by the API's server-side
-- ST_DWithin check -- never trust a client-submitted true here.
-- ---------------------------------------------------------------------
create type crowd_level as enum ('empty', 'light', 'moderate', 'busy', 'packed');

create table line_reports (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  wait_estimate_minutes integer check (wait_estimate_minutes >= 0),
  crowd_level crowd_level not null,
  note text,
  media_url text,
  geofence_verified boolean not null default false,
  -- Coordinates the report was submitted from, kept for audit / abuse
  -- investigation (distinct from the venue's own geog).
  reported_from_geog geography(point, 4326) not null,
  created_at timestamptz not null default now()
);

create index line_reports_venue_id_created_at_idx on line_reports (venue_id, created_at desc);

alter table line_reports enable row level security;

create policy "line reports are publicly readable"
  on line_reports for select
  using (true);

-- Inserts only ever come from apps/api using the service role key (so it
-- can independently verify geofence_verified server-side), not directly
-- from client devices. No client insert policy is defined on purpose.

-- ---------------------------------------------------------------------
-- reporter_scores
-- accuracy_score in [0, 1]; used to weight a reporter's reports in the
-- scoring algorithm (apps/api/src/scoring/weightedScore.ts). Starts at a
-- neutral 0.75 to avoid a cold-start penalty for brand-new reporters.
-- ---------------------------------------------------------------------
create table reporter_scores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  accuracy_score numeric(4, 3) not null default 0.750 check (accuracy_score between 0 and 1),
  reports_submitted integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table reporter_scores enable row level security;

create policy "reporter scores are readable by their owner"
  on reporter_scores for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- favorites (pinned venues) -- small enough to include in Phase 1
-- ---------------------------------------------------------------------
create table favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references venues (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);

alter table favorites enable row level security;

create policy "favorites are managed by their owner"
  on favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- venues_with_coords
-- PostgREST (which the mobile app and API query through) can't evaluate
-- ST_X/ST_Y on the fly, so this view exposes plain lat/lng alongside the
-- raw geography column for anything that needs to do its own PostGIS math
-- (e.g. the API's geofence check via the RPC function below).
-- ---------------------------------------------------------------------
create view venues_with_coords as
  select
    v.*,
    st_y(v.geog::geometry) as latitude,
    st_x(v.geog::geometry) as longitude
  from venues v;

-- ---------------------------------------------------------------------
-- is_within_geofence
-- Server-side source of truth for "is this point within `radius_meters`
-- of this venue". Called by apps/api (service role) -- never trust a
-- client-submitted geofence_verified boolean.
-- ---------------------------------------------------------------------
create function is_within_geofence(
  venue_id uuid,
  lat double precision,
  lng double precision,
  radius_meters double precision default 152 -- ~500 ft
) returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from venues v
    where v.id = venue_id
      and st_dwithin(v.geog, st_setsrid(st_makepoint(lng, lat), 4326)::geography, radius_meters)
  );
$$;

-- ---------------------------------------------------------------------
-- increment_reports_submitted
-- Upserts a reporter_scores row (new reporters start at the neutral
-- default accuracy_score) and bumps their submitted count. Called by the
-- API after a successful report insert.
-- ---------------------------------------------------------------------
create function increment_reports_submitted(p_user_id uuid) returns void
language sql
as $$
  insert into reporter_scores (user_id, reports_submitted)
  values (p_user_id, 1)
  on conflict (user_id)
  do update set reports_submitted = reporter_scores.reports_submitted + 1, updated_at = now();
$$;
