import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { requireAuth } from './lib/requireAuth';
import { reportsRouter } from './routes/reports';
import { venuesRouter } from './routes/venues';
import { fastPassRouter } from './routes/fastPass';
import { fastPassRedeemPageRouter } from './routes/fastPassRedeemPage';
import { billingRouter, stripeWebhookHandler } from './routes/billing';

const app = express();
app.use(cors());

// Mounted before express.json() -- Stripe's webhook signature check needs
// the exact raw request bytes, which JSON-parsing would otherwise alter
// before this handler ever saw them.
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/venues', venuesRouter);
app.use('/reports', requireAuth, reportsRouter);

// Mounted before the requireAuth-protected /fast-pass routes below: Express
// matches app.use() by path prefix, so if the general /fast-pass handler
// were registered first, its requireAuth would incorrectly intercept
// /fast-pass/redeem/:token requests too. This is the public, no-login
// "staff view" page reached by scanning a QR code, not an authenticated
// API client.
app.use('/fast-pass/redeem', fastPassRedeemPageRouter);
app.use('/fast-pass', requireAuth, fastPassRouter);
app.use('/fast-pass', requireAuth, billingRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Linez API listening on :${port}`);
});
