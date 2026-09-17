import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Coordinates } from '@linez/shared';

interface UserLocationState {
  location: Coordinates | null;
  permissionDenied: boolean;
}

/** Foreground-only location, polled while a screen is mounted. Background
 * geofencing (needed for Here Now presence in Phase 3) is a separate,
 * heavier permission (expo-task-manager + background location) -- not
 * requested here since Phase 1 only needs "where am I right now" for the
 * report-submission geofence check and distance sorting. */
export function useUserLocation(): UserLocationState {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10_000, distanceInterval: 25 },
        (position) => {
          setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        },
      );
    })();

    return () => subscription?.remove();
  }, []);

  return { location, permissionDenied };
}
