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

// --- Phase 2: Fast Pass ---

export type SubscriptionTier = 'monthly' | 'credit_pack';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  renewalDate: string | null;
  passesRemaining: number;
}

export interface FastPassRedemption {
  id: string;
  venueId: string;
  venueName: string;
  qrToken: string;
  /** The URL to encode in the QR code -- opening it (any camera app) shows
   * door staff the pass's validity. Redemption itself only happens when
   * they tap "Confirm" on that page, not on page load. */
  redeemUrl: string;
  redeemed: boolean;
  createdAt: string;
}

/** Number of passes a `monthly` subscription grants per billing period.
 * A product/business decision, not a technical constant -- kept in one
 * place (here) so apps/api's webhook handler and any future pricing page
 * agree on it without duplicating the number. */
export const MONTHLY_FAST_PASS_ALLOTMENT = 4;
