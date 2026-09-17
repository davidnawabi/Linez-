import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseClient';

export const fastPassRedeemPageRouter = Router();

// This is the entire "staff app" for Phase 2 -- see ARCHITECTURE.md.
// Deliberately no login, no dashboard: it's the page a bouncer's own
// camera app opens when they scan the QR code on a customer's phone.

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function page(body: string) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Linez Fast Pass</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
  .card { max-width: 360px; text-align: center; }
  .icon { font-size: 64px; margin-bottom: 16px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #aaa; margin: 0 0 24px; }
  button { font-size: 17px; font-weight: 600; padding: 14px 32px; border-radius: 10px; border: none; background: #5856D6; color: #fff; width: 100%; }
  .status { padding: 14px 0; }
</style>
</head><body><div class="card">${body}</div></body></html>`;
}

// GET /fast-pass/redeem/:token -- read-only. Shows validity and, if not
// yet redeemed, a confirm button. Does NOT redeem on its own: a GET must
// stay side-effect-free here since messaging apps and browsers routinely
// prefetch links, which would otherwise burn a real pass before a human
// ever saw the page.
fastPassRedeemPageRouter.get('/:token', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('fast_pass_redemptions')
    .select('redeemed, redeemed_at, venues(name)')
    .eq('qr_token', req.params.token)
    .maybeSingle<{ redeemed: boolean; redeemed_at: string | null; venues: { name: string } | null }>();

  if (error) {
    res.status(500).send(page(`<div class="icon">⚠️</div><h1>Something went wrong</h1><p>${error.message}</p>`));
    return;
  }

  if (!data) {
    res.status(404).send(page('<div class="icon">✗</div><h1>Invalid pass</h1><p>This Fast Pass code was not recognized.</p>'));
    return;
  }

  if (data.redeemed) {
    res.send(
      page(
        `<div class="icon">✓</div><h1>Already used</h1><p>${escapeHtml(data.venues?.name ?? 'This venue')} — redeemed at ${new Date(data.redeemed_at!).toLocaleTimeString()}</p>`,
      ),
    );
    return;
  }

  res.send(
    page(`
      <div class="icon">🎟️</div>
      <h1>Valid Fast Pass</h1>
      <p>${escapeHtml(data.venues?.name ?? 'This venue')}</p>
      <form method="POST" action="/fast-pass/redeem/${req.params.token}">
        <button type="submit">Confirm redemption</button>
      </form>
    `),
  );
});

// POST /fast-pass/redeem/:token -- the actual redemption. Idempotent: the
// underlying redeem_fast_pass() function is safe to call more than once,
// which matters because a bouncer double-tapping or re-scanning a pass
// they already confirmed is a completely normal, expected flow.
fastPassRedeemPageRouter.post('/:token', async (req, res) => {
  const { data, error } = await supabaseAdmin.rpc('redeem_fast_pass', { p_qr_token: req.params.token }).single<{
    found: boolean;
    already_redeemed: boolean;
    venue_name: string | null;
    redeemed_at: string | null;
  }>();

  if (error) {
    res.status(500).send(page(`<div class="icon">⚠️</div><h1>Something went wrong</h1><p>${error.message}</p>`));
    return;
  }

  if (!data.found) {
    res.status(404).send(page('<div class="icon">✗</div><h1>Invalid pass</h1><p>This Fast Pass code was not recognized.</p>'));
    return;
  }

  const heading = data.already_redeemed ? 'Already used' : 'Redeemed';
  res.send(
    page(
      `<div class="icon">✓</div><h1>${heading}</h1><p>${escapeHtml(data.venue_name ?? 'This venue')} — ${new Date(data.redeemed_at!).toLocaleTimeString()}</p>`,
    ),
  );
});
