import { describe, expect, it } from 'vitest';
import { computeWeightedVenueStatus } from './weightedScore';

describe('computeWeightedVenueStatus', () => {
  it('returns no data for an empty report list', () => {
    const result = computeWeightedVenueStatus([]);
    expect(result).toEqual({
      crowdLevel: null,
      waitEstimateMinutes: null,
      confidence: 0,
      lastReportAt: null,
    });
  });

  it('weights a recent report more than a stale one', () => {
    const now = new Date('2026-01-01T02:00:00Z');
    const result = computeWeightedVenueStatus(
      [
        {
          createdAt: new Date('2026-01-01T01:59:00Z'), // 1 minute ago
          waitEstimateMinutes: 5,
          crowdLevel: 'light',
          reporterAccuracyScore: 0.9,
        },
        {
          createdAt: new Date('2026-01-01T00:30:00Z'), // 90 minutes ago
          waitEstimateMinutes: 60,
          crowdLevel: 'packed',
          reporterAccuracyScore: 0.9,
        },
      ],
      now,
    );

    expect(result.waitEstimateMinutes).toBeLessThan(30);
    expect(result.crowdLevel).toBe('light');
  });

  it('ignores reports older than the max age window', () => {
    const now = new Date('2026-01-01T05:00:00Z');
    const result = computeWeightedVenueStatus(
      [
        {
          createdAt: new Date('2026-01-01T01:00:00Z'), // 4 hours ago
          waitEstimateMinutes: 10,
          crowdLevel: 'busy',
          reporterAccuracyScore: 1,
        },
      ],
      now,
    );

    expect(result.crowdLevel).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('down-weights a low-reliability reporter relative to a high-reliability one', () => {
    const now = new Date('2026-01-01T02:00:00Z');
    const reliable = computeWeightedVenueStatus(
      [
        {
          createdAt: now,
          waitEstimateMinutes: 40,
          crowdLevel: 'packed',
          reporterAccuracyScore: 1,
        },
      ],
      now,
    );
    const unreliable = computeWeightedVenueStatus(
      [
        {
          createdAt: now,
          waitEstimateMinutes: 40,
          crowdLevel: 'packed',
          reporterAccuracyScore: 0.2,
        },
      ],
      now,
    );

    expect(unreliable.confidence).toBeLessThan(reliable.confidence);
  });
});
