export type VenueCategory = 'bar' | 'club' | 'restaurant';

export type CrowdLevel = 'empty' | 'light' | 'moderate' | 'busy' | 'packed';

export const CROWD_LEVELS: CrowdLevel[] = ['empty', 'light', 'moderate', 'busy', 'packed'];

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  location: Coordinates;
  category: VenueCategory;
  hours: Record<string, string> | null;
  coverChargeInfo: string | null;
  isFastPassPartner: boolean;
}

/** A single crowdsourced report. Distinct from `VenueStatus`, which is the
 * derived, weighted summary shown to users. */
export interface LineReport {
  id: string;
  venueId: string;
  userId: string;
  waitEstimateMinutes: number | null;
  crowdLevel: CrowdLevel;
  note: string | null;
  mediaUrl: string | null;
  geofenceVerified: boolean;
  createdAt: string;
}

/** The derived, weighted-and-decayed summary for a venue, computed by
 * apps/api/src/scoring/weightedScore.ts -- never a flat average of
 * LineReports and never computed on the client. */
export interface VenueStatus {
  venueId: string;
  crowdLevel: CrowdLevel | null;
  waitEstimateMinutes: number | null;
  confidence: number; // 0-1, reflects report recency + volume + reporter reliability
  lastReportAt: string | null;
}

export interface SubmitReportInput {
  venueId: string;
  waitEstimateMinutes: number | null;
  crowdLevel: CrowdLevel;
  note?: string;
  mediaUrl?: string;
  reportedFrom: Coordinates;
}

export const GEOFENCE_RADIUS_METERS = 152; // ~500 ft
