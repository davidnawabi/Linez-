import type { Coordinates } from '@linez/shared';
import { GEOFENCE_RADIUS_METERS } from '@linez/shared';
import { supabaseAdmin } from '../lib/supabaseClient';

/**
 * The only place `geofence_verified` is decided. Calls the `is_within_geofence`
 * Postgres function (PostGIS ST_DWithin) rather than doing the distance math
 * in JS, so this stays correct as the source of truth even if a client's
 * own (spoofable) location check disagrees.
 */
export async function verifyGeofence(venueId: string, reportedFrom: Coordinates): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('is_within_geofence', {
    venue_id: venueId,
    lat: reportedFrom.latitude,
    lng: reportedFrom.longitude,
    radius_meters: GEOFENCE_RADIUS_METERS,
  });

  if (error) {
    throw new Error(`Geofence check failed: ${error.message}`);
  }

  return Boolean(data);
}
