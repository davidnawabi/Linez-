import type { Coordinates } from '@linez/shared';
import { GEOFENCE_RADIUS_METERS } from '@linez/shared';

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in meters. Used here only for immediate client-side
 * UI feedback ("you're too far to report") -- the API independently
 * re-checks with PostGIS before ever setting geofence_verified = true,
 * since a client-reported location/result is trivially spoofable (mock
 * GPS apps). Never trust this function's result for anything the server
 * treats as authoritative. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_METERS * c;
}

export function isWithinGeofence(userLocation: Coordinates, venueLocation: Coordinates): boolean {
  return distanceMeters(userLocation, venueLocation) <= GEOFENCE_RADIUS_METERS;
}
