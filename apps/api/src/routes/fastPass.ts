import { Router } from 'express';
import type { FastPassRedemption, Subscription } from '@linez/shared';
import { supabaseAdmin } from '../lib/supabaseClient';

export const fastPassRouter = Router();

const publicApiUrl = process.env.PUBLIC_API_URL;
if (!publicApiUrl) {
  throw new Error('PUBLIC_API_URL must be set (see .env.example) -- it is encoded into every Fast Pass QR code');
}

interface VenuePartnerAgreementRow {
  venue_id: string;
  nightly_pass_cap: number;
  blackout_rules: { date: string; reason?: string }[];
}

interface SubscriptionRow {
  id: string;
  tier: Subscription['tier'];
  status: Subscription['status'];
  renewal_date: string | null;
  passes_remaining: number;
}

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    tier: row.tier,
    status: row.status,
    renewalDate: row.renewal_date,
    passesRemaining: row.passes_remaining,
  };
}

async function getActiveSubscription(userId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, tier, status, renewal_date, passes_remaining')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

// GET /fast-pass/subscription
fastPassRouter.get('/subscription', async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const subscription = await getActiveSubscription(userId);
  res.json({ subscription: subscription ? toSubscription(subscription) : null });
});

// POST /fast-pass/redemptions
// Every check here is enforced server-side against the database, not
// trusted from the request -- a client can only ever ask "can I have a
// Fast Pass at venue X," never assert that it already qualifies.
fastPassRouter.post('/redemptions', async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const venueId = req.body?.venueId as string | undefined;
  if (!venueId) {
    res.status(400).json({ error: 'venueId is required' });
    return;
  }

  const { data: venue, error: venueError } = await supabaseAdmin
    .from('venues')
    .select('id, name, is_fast_pass_partner')
    .eq('id', venueId)
    .maybeSingle();

  if (venueError) {
    res.status(500).json({ error: venueError.message });
    return;
  }
  if (!venue) {
    res.status(404).json({ error: 'Venue not found' });
    return;
  }
  if (!venue.is_fast_pass_partner) {
    res.status(403).json({ error: 'This venue does not offer Fast Pass' });
    return;
  }

  const { data: agreement, error: agreementError } = await supabaseAdmin
    .from('venue_partner_agreements')
    .select('venue_id, nightly_pass_cap, blackout_rules')
    .eq('venue_id', venueId)
    .maybeSingle<VenuePartnerAgreementRow>();

  if (agreementError) {
    res.status(500).json({ error: agreementError.message });
    return;
  }
  if (!agreement) {
    res.status(403).json({ error: 'Fast Pass is not configured for this venue yet' });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const blackout = agreement.blackout_rules.find((rule) => rule.date === today);
  if (blackout) {
    res.status(403).json({ error: `Fast Pass is not available at this venue tonight${blackout.reason ? `: ${blackout.reason}` : ''}` });
    return;
  }

  const { data: nightlyCount, error: countError } = await supabaseAdmin.rpc('fast_pass_nightly_count', {
    p_venue_id: venueId,
  });

  if (countError) {
    res.status(500).json({ error: countError.message });
    return;
  }
  if ((nightlyCount as number) >= agreement.nightly_pass_cap) {
    res.status(409).json({ error: 'Fast Pass is sold out at this venue tonight' });
    return;
  }

  let subscription: SubscriptionRow | null;
  try {
    subscription = await getActiveSubscription(userId);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
    return;
  }
  if (!subscription || subscription.passes_remaining <= 0) {
    res.status(402).json({ error: 'No active Fast Pass subscription with passes remaining' });
    return;
  }

  const { data: redemption, error: insertError } = await supabaseAdmin
    .from('fast_pass_redemptions')
    .insert({ user_id: userId, venue_id: venueId, subscription_id: subscription.id })
    .select('id, venue_id, qr_token, redeemed, created_at')
    .single();

  if (insertError) {
    // Postgres unique_violation -- the DB-level anti-abuse constraint
    // (fast_pass_one_pending_per_user_venue) is the actual source of
    // truth here, not this status code; this just translates it.
    if (insertError.code === '23505') {
      res.status(409).json({ error: 'You already have a pending Fast Pass at this venue' });
      return;
    }
    res.status(500).json({ error: insertError.message });
    return;
  }

  // Known simplification: this read-then-write isn't atomic, so two
  // concurrent redemption requests from the same user could both read the
  // same passes_remaining and both succeed in decrementing it once,
  // over-granting by one pass in that race. Acceptable at MVP scale (a
  // user racing themselves); an atomic RPC decrement is the fix if this
  // becomes a real abuse vector at higher volume.
  const { error: decrementError } = await supabaseAdmin
    .from('subscriptions')
    .update({ passes_remaining: subscription.passes_remaining - 1 })
    .eq('id', subscription.id);

  if (decrementError) {
    // eslint-disable-next-line no-console
    console.error('Failed to decrement passes_remaining', decrementError.message);
  }

  const result: FastPassRedemption = {
    id: redemption.id,
    venueId: redemption.venue_id,
    venueName: venue.name,
    qrToken: redemption.qr_token,
    redeemUrl: `${publicApiUrl}/fast-pass/redeem/${redemption.qr_token}`,
    redeemed: redemption.redeemed,
    createdAt: redemption.created_at,
  };

  res.status(201).json({ redemption: result });
});
