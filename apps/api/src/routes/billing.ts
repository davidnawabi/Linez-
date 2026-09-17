import express, { Router } from 'express';
import { MONTHLY_FAST_PASS_ALLOTMENT } from '@linez/shared';
import { supabaseAdmin } from '../lib/supabaseClient';
import { stripe, STRIPE_MONTHLY_PRICE_ID } from '../lib/stripeClient';

export const billingRouter = Router();

const appBaseUrl = process.env.APP_BASE_URL;
if (!appBaseUrl) {
  throw new Error('APP_BASE_URL must be set (see .env.example) -- Stripe Checkout redirects back to it');
}
if (!STRIPE_MONTHLY_PRICE_ID) {
  throw new Error('STRIPE_MONTHLY_PRICE_ID must be set (see .env.example) -- the Stripe Price for the monthly Fast Pass tier');
}

// POST /fast-pass/checkout
// Creates a Stripe Checkout session for the monthly Fast Pass subscription
// and hands the mobile app a URL to open (in a system browser / WebView,
// not embedded card fields -- Checkout is Stripe-hosted so this app never
// touches raw card data). The `subscriptions` row itself is only ever
// created by the webhook handler below, once Stripe confirms payment --
// never here, since a client hitting this endpoint has not paid yet.
billingRouter.post('/checkout', async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: STRIPE_MONTHLY_PRICE_ID, quantity: 1 }],
      client_reference_id: userId,
      success_url: `${appBaseUrl}/fast-pass/subscribed`,
      cancel_url: `${appBaseUrl}/fast-pass`,
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /webhooks/stripe
// A standalone handler, not part of billingRouter, because it must be
// mounted in index.ts with express.raw() (not express.json()) -- Stripe's
// signature verification needs the exact raw request bytes, which the
// app's global express.json() middleware would already have altered by
// the time a router-nested handler saw the request.
export async function stripeWebhookHandler(req: express.Request, res: express.Response) {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !signature) {
    res.status(400).send('Missing webhook signature configuration');
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, signature, webhookSecret);
  } catch (err) {
    res.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id;
      if (!userId || !session.subscription || !session.customer) break;

      await supabaseAdmin.from('subscriptions').insert({
        user_id: userId,
        tier: 'monthly',
        status: 'active',
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        passes_remaining: MONTHLY_FAST_PASS_ALLOTMENT,
      });
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as { subscription?: string | null; period_end?: number };
      if (!invoice.subscription) break;

      // Renewal: reset the monthly allotment. A first invoice (from the
      // same checkout that creates the row above) also fires this event;
      // resetting to the same allotment on that first invoice too is
      // harmless, so no special-casing is needed here.
      await supabaseAdmin
        .from('subscriptions')
        .update({
          passes_remaining: MONTHLY_FAST_PASS_ALLOTMENT,
          status: 'active',
          renewal_date: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString().slice(0, 10) : null,
        })
        .eq('stripe_subscription_id', invoice.subscription);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const status = subscription.status === 'active' ? 'active' : subscription.status === 'past_due' ? 'past_due' : null;
      if (!status) break;

      await supabaseAdmin.from('subscriptions').update({ status }).eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }
  }

  res.json({ received: true });
}
