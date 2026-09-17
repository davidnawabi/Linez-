-- Phase 2: Fast Pass (skip-the-line subscription)
--
-- MVP scope decisions (the two things the earlier stub left as open
-- business questions -- see ARCHITECTURE.md "Phase 2" for the full
-- reasoning):
--   1. No Stripe Connect / venue revenue share for MVP. Fast Pass is a
--      pure user-paid perk. venue_partner_agreements has no
--      stripe_connect_account_id column -- adding a revenue share later
--      is a new migration, not a rewrite of this one.
--   2. No staff-facing app. Per the brief's own MVP scope, door
--      verification is a human glancing at the pass screen (timestamp +
--      photo ID). The only backend concession to this is a no-login
--      "confirm redemption" web page reachable from the QR code's own
--      encoded URL (apps/api serves it) -- not a staff app, just the
--      smallest possible version of the brief's "lightweight web view."
--
-- "Tonight," for nightly-cap and one-pass-per-venue purposes, is defined
-- as a trailing 12-hour window from now rather than a calendar-date split,
-- specifically to avoid the bug where a venue open past midnight would
-- have its one real night incorrectly counted as two. This is a
-- deliberate simplification, not an oversight -- a fully timezone- and
-- venue-hours-aware definition is future work, not MVP-blocking.

create extension if not exists pgcrypto;

create type subscription_tier as enum ('monthly', 'credit_pack');
create type subscription_status as enum ('active', 'past_due', 'canceled');

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tier subscription_tier not null,
  status subscription_status not null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  renewal_date date,
  passes_remaining integer not null default 0,
  created_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on subscriptions (user_id);

alter table subscriptions enable row level security;

create policy "subscriptions are readable by their owner"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Inserts/updates only ever come from apps/api (service role), driven by
-- Stripe webhook events -- no client write policy is defined on purpose.

create table venue_partner_agreements (
  venue_id uuid primary key references venues (id) on delete cascade,
  nightly_pass_cap integer not null,
  blackout_rules jsonb not null default '[]', -- e.g. [{ "date": "2026-12-31", "reason": "private event" }]
  cover_charge_waived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table venue_partner_agreements enable row level security;

create policy "venue partner agreements are publicly readable"
  on venue_partner_agreements for select
  using (true);

create table fast_pass_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references venues (id) on delete cascade,
  subscription_id uuid references subscriptions (id) on delete set null,
  qr_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  redeemed boolean not null default false,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index fast_pass_redemptions_user_id_idx on fast_pass_redemptions (user_id);
create index fast_pass_redemptions_venue_id_created_at_idx on fast_pass_redemptions (venue_id, created_at);

alter table fast_pass_redemptions enable row level security;

create policy "fast pass redemptions are readable by their owner"
  on fast_pass_redemptions for select
  using (auth.uid() = user_id);

-- Anti-abuse: at most one *unredeemed* pass per user per venue at a time.
-- A user who already redeemed a pass tonight and wants a second (e.g. for
-- a second trip back to the same venue) is a real, if unusual, case this
-- intentionally still allows -- what it blocks is requesting a second
-- pass while the first hasn't been used yet.
create unique index fast_pass_one_pending_per_user_venue
  on fast_pass_redemptions (user_id, venue_id)
  where not redeemed;

-- ---------------------------------------------------------------------
-- fast_pass_nightly_count
-- Counts passes issued to a venue in the trailing 12 hours ("tonight"),
-- regardless of redeemed status -- the nightly cap represents how many
-- people the venue is willing to let skip the line, which is decided at
-- issuance time, not at redemption time.
-- ---------------------------------------------------------------------
create function fast_pass_nightly_count(p_venue_id uuid) returns integer
language sql
stable
as $$
  select count(*)::integer
  from fast_pass_redemptions
  where venue_id = p_venue_id
    and created_at >= now() - interval '12 hours';
$$;

-- ---------------------------------------------------------------------
-- redeem_fast_pass
-- The entire "staff app": marks a pass redeemed by its qr_token. Called
-- from the no-login confirmation page apps/api serves at the QR code's
-- own URL. Idempotent on purpose -- scanning an already-redeemed pass
-- again just reports it as such rather than erroring, since a bouncer
-- re-scanning to double check is a normal, expected flow.
-- ---------------------------------------------------------------------
create function redeem_fast_pass(p_qr_token text) returns table (
  found boolean,
  already_redeemed boolean,
  venue_name text,
  redeemed_at timestamptz
)
language plpgsql
as $$
declare
  v_row fast_pass_redemptions;
  v_was_already_redeemed boolean;
begin
  select * into v_row from fast_pass_redemptions where qr_token = p_qr_token;

  if not found then
    return query select false, false, null::text, null::timestamptz;
    return;
  end if;

  v_was_already_redeemed := v_row.redeemed;

  if not v_row.redeemed then
    update fast_pass_redemptions
    set redeemed = true, redeemed_at = now()
    where id = v_row.id
    returning * into v_row;
  end if;

  return query
    select true, v_was_already_redeemed, v.name, v_row.redeemed_at
    from venues v where v.id = v_row.venue_id;
end;
$$;
