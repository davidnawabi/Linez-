import { Router } from 'express';
import type { Venue, VenueStatus } from '@linez/shared';
import { supabaseAdmin } from '../lib/supabaseClient';
import { computeWeightedVenueStatus, type ScorableReport } from '../scoring/weightedScore';

export const venuesRouter = Router();

interface VenueRow {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: Venue['category'];
  hours: Venue['hours'];
  cover_charge_info: string | null;
  is_fast_pass_partner: boolean;
}

function toVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    location: { latitude: row.latitude, longitude: row.longitude },
    category: row.category,
    hours: row.hours,
    coverChargeInfo: row.cover_charge_info,
    isFastPassPartner: row.is_fast_pass_partner,
  };
}

// GET /venues -> all venues plus each one's current weighted status.
// A single list endpoint keeps map view and list view backed by the same
// data (and the same scoring), rather than each screen computing its own.
venuesRouter.get('/', async (_req, res) => {
  const { data: venueRows, error: venueError } = await supabaseAdmin
    .from('venues_with_coords')
    .select('id, name, address, latitude, longitude, category, hours, cover_charge_info, is_fast_pass_partner');

  if (venueError) {
    res.status(500).json({ error: venueError.message });
    return;
  }

  const venueIds = (venueRows as VenueRow[]).map((v) => v.id);

  const { data: reportRows, error: reportError } = await supabaseAdmin
    .from('line_reports')
    .select('venue_id, created_at, wait_estimate_minutes, crowd_level, reporter_scores(accuracy_score)')
    .in('venue_id', venueIds)
    .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

  if (reportError) {
    res.status(500).json({ error: reportError.message });
    return;
  }

  interface ReportRow {
    venue_id: string;
    created_at: string;
    wait_estimate_minutes: number | null;
    crowd_level: ScorableReport['crowdLevel'];
    reporter_scores: { accuracy_score: number } | null;
  }

  const reportsByVenue = new Map<string, ScorableReport[]>();
  for (const row of reportRows as unknown as ReportRow[]) {
    const list = reportsByVenue.get(row.venue_id) ?? [];
    list.push({
      createdAt: new Date(row.created_at),
      waitEstimateMinutes: row.wait_estimate_minutes,
      crowdLevel: row.crowd_level,
      reporterAccuracyScore: row.reporter_scores?.accuracy_score ?? 0.75,
    });
    reportsByVenue.set(row.venue_id, list);
  }

  const venues = (venueRows as VenueRow[]).map(toVenue);
  const statuses: Record<string, VenueStatus> = {};
  for (const venue of venues) {
    const status = computeWeightedVenueStatus(reportsByVenue.get(venue.id) ?? []);
    statuses[venue.id] = { venueId: venue.id, ...status };
  }

  res.json({ venues, statuses });
});
