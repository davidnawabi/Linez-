import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { requireAuth } from './lib/requireAuth';
import { reportsRouter } from './routes/reports';
import { venuesRouter } from './routes/venues';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/venues', venuesRouter);
app.use('/reports', requireAuth, reportsRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Linez API listening on :${port}`);
});
