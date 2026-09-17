import type { CrowdLevel } from '@linez/shared';
import { CROWD_LEVELS } from '@linez/shared';

export interface ScorableReport {
  createdAt: Date;
  waitEstimateMinutes: number | null;
  crowdLevel: CrowdLevel;
  reporterAccuracyScore: number; // 0-1, from reporter_scores.accuracy_score
}

export interface WeightedVenueStatus {
  crowdLevel: CrowdLevel | null;
  waitEstimateMinutes: number | null;
  confidence: number; // 0-1
  lastReportAt: string | null;
}

// Wait times swing fast (a line can clear in minutes), so recency dominates
// the weight. 20 minutes was chosen as a starting point, not tuned against
// real data yet -- revisit once Phase 1 has usage to validate against.
const HALF_LIFE_MINUTES = 20;

// Reports older than this stop contributing at all, even if reporter
// accuracy is high -- a decayed-to-near-zero weight still isn't "no data".
const MAX_REPORT_AGE_MINUTES = 120;

function ageWeight(ageMinutes: number): number {
  return Math.pow(0.5, ageMinutes / HALF_LIFE_MINUTES);
}

const crowdLevelToIndex = (level: CrowdLevel): number => CROWD_LEVELS.indexOf(level);
const indexToCrowdLevel = (index: number): CrowdLevel => CROWD_LEVELS[Math.round(index)];

/**
 * Combines recent reports into a single venue status. Deliberately not a
 * flat average: each report's contribution decays with age and is scaled
 * by the reporting user's historical accuracy, so one stale report or one
 * habitually-inaccurate reporter can't dominate the result.
 */
export function computeWeightedVenueStatus(
  reports: ScorableReport[],
  now: Date = new Date(),
): WeightedVenueStatus {
  const relevant = reports.filter((r) => {
    const ageMinutes = (now.getTime() - r.createdAt.getTime()) / 60_000;
    return ageMinutes >= 0 && ageMinutes <= MAX_REPORT_AGE_MINUTES;
  });

  if (relevant.length === 0) {
    return { crowdLevel: null, waitEstimateMinutes: null, confidence: 0, lastReportAt: null };
  }

  let totalWeight = 0;
  let weightedWaitSum = 0;
  let waitWeight = 0;
  let weightedCrowdIndexSum = 0;
  let lastReportAt: Date | null = null;

  for (const report of relevant) {
    const ageMinutes = (now.getTime() - report.createdAt.getTime()) / 60_000;
    const weight = ageWeight(ageMinutes) * report.reporterAccuracyScore;

    totalWeight += weight;
    weightedCrowdIndexSum += crowdLevelToIndex(report.crowdLevel) * weight;

    if (report.waitEstimateMinutes !== null) {
      weightedWaitSum += report.waitEstimateMinutes * weight;
      waitWeight += weight;
    }

    if (!lastReportAt || report.createdAt > lastReportAt) {
      lastReportAt = report.createdAt;
    }
  }

  // Confidence reflects both how much recent, reliable signal exists and
  // how many independent reports back it up -- a single very-recent report
  // from a high-accuracy reporter still shouldn't read as "certain."
  const volumeFactor = Math.min(relevant.length / 5, 1);
  const confidence = Math.min((totalWeight / relevant.length) * volumeFactor * 1.5, 1);

  return {
    crowdLevel: totalWeight > 0 ? indexToCrowdLevel(weightedCrowdIndexSum / totalWeight) : null,
    waitEstimateMinutes: waitWeight > 0 ? Math.round(weightedWaitSum / waitWeight) : null,
    confidence: Math.round(confidence * 100) / 100,
    lastReportAt: lastReportAt ? lastReportAt.toISOString() : null,
  };
}
