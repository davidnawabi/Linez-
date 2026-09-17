import { Router } from 'express';
import type { SubmitReportInput } from '@linez/shared';
import { supabaseAdmin } from '../lib/supabaseClient';
import { verifyGeofence } from '../geofence/verify';

export const reportsRouter = Router();

// POST /reports
// Requires an authenticated user (see requireAuth middleware in index.ts,
// which sets req.userId from the Supabase JWT). geofence_verified is always
// computed here server-side -- the request body's location is only ever
// used as an input to that check, never written through as-is.
reportsRouter.post('/', async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = req.body as SubmitReportInput;
  if (!body?.venueId || !body?.crowdLevel || !body?.reportedFrom) {
    res.status(400).json({ error: 'venueId, crowdLevel, and reportedFrom are required' });
    return;
  }

  let geofenceVerified: boolean;
  try {
    geofenceVerified = await verifyGeofence(body.venueId, body.reportedFrom);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
    return;
  }

  if (!geofenceVerified) {
    res.status(403).json({ error: 'You must be within ~500 ft of the venue to submit a report' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('line_reports')
    .insert({
      venue_id: body.venueId,
      user_id: userId,
      wait_estimate_minutes: body.waitEstimateMinutes,
      crowd_level: body.crowdLevel,
      note: body.note ?? null,
      media_url: body.mediaUrl ?? null,
      geofence_verified: geofenceVerified,
      reported_from_geog: `SRID=4326;POINT(${body.reportedFrom.longitude} ${body.reportedFrom.latitude})`,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Non-fatal: the report itself already succeeded. Log and move on
  // rather than failing the request over a bookkeeping counter.
  const { error: rpcError } = await supabaseAdmin.rpc('increment_reports_submitted', { p_user_id: userId });
  if (rpcError) {
    // eslint-disable-next-line no-console
    console.error('Failed to increment reports_submitted', rpcError.message);
  }

  res.status(201).json({ report: data });
});
