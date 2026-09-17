import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from './supabaseClient';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Verifies the mobile app's Supabase JWT and attaches req.userId. Routes
 * that write data (currently just report submission) require this; venue
 * reads stay public. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = data.user.id;
  next();
}
