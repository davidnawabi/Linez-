import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useVenues } from '../hooks/useVenues';
import { useUserLocation } from '../hooks/useUserLocation';
import { isWithinGeofence } from '../lib/geofence';
import { CrowdLevelBadge } from '../components/CrowdLevelBadge';

type Props = NativeStackScreenProps<RootStackParamList, 'VenueDetail'>;

export function VenueDetailScreen({ route, navigation }: Props) {
  const { venueId } = route.params;
  const { venues, statuses } = useVenues();
  const { location, permissionDenied } = useUserLocation();

  const venue = venues.find((v) => v.id === venueId);
  const status = statuses[venueId];

  if (!venue) {
    return (
      <View style={styles.center}>
        <Text>Loading venue...</Text>
      </View>
    );
  }

  const canReport = !permissionDenied && !!location && isWithinGeofence(location, venue.location);

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{venue.name}</Text>
      <Text style={styles.address}>{venue.address}</Text>

      <View style={styles.statusRow}>
        <CrowdLevelBadge level={status?.crowdLevel ?? null} />
        {status?.waitEstimateMinutes != null && (
          <Text style={styles.wait}>~{status.waitEstimateMinutes} min wait</Text>
        )}
      </View>

      {status?.lastReportAt && (
        <Text style={styles.meta}>Last reported {new Date(status.lastReportAt).toLocaleTimeString()}</Text>
      )}

      {venue.coverChargeInfo && <Text style={styles.meta}>{venue.coverChargeInfo}</Text>}
      {venue.isFastPassPartner && <Text style={styles.fastPass}>Fast Pass available at this venue</Text>}

      <View style={styles.reportButton}>
        <Button
          title={canReport ? 'Submit a report' : "You're too far to report"}
          disabled={!canReport}
          onPress={() => navigation.navigate('SubmitReport', { venueId })}
        />
        {!canReport && (
          <Text style={styles.meta}>
            You need to be within ~500 ft of {venue.name} to submit a wait-time report.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 24, fontWeight: '700' },
  address: { fontSize: 14, color: '#6E6E73', marginTop: 4, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  wait: { fontSize: 15, fontWeight: '500' },
  meta: { fontSize: 13, color: '#6E6E73', marginTop: 4 },
  fastPass: { fontSize: 13, color: '#5856D6', marginTop: 8, fontWeight: '500' },
  reportButton: { marginTop: 24 },
});
