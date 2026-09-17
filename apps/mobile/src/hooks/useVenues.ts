import { useCallback, useEffect, useState } from 'react';
import type { Venue, VenueStatus } from '@linez/shared';
import { fetchVenues } from '../lib/api';

interface VenuesState {
  venues: Venue[];
  statuses: Record<string, VenueStatus>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useVenues(): VenuesState {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [statuses, setStatuses] = useState<Record<string, VenueStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchVenues()
      .then((data) => {
        if (cancelled) return;
        setVenues(data.venues);
        setStatuses(data.statuses);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  return { venues, statuses, loading, error, refresh };
}
