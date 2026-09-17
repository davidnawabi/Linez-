import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Venue, VenueStatus } from '@linez/shared';
import { CrowdLevelBadge } from './CrowdLevelBadge';

interface Props {
  venue: Venue;
  status: VenueStatus | undefined;
  distanceMeters: number | null;
  onPress: () => void;
}

export function VenueListItem({ venue, status, distanceMeters, onPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.info}>
        <Text style={styles.name}>{venue.name}</Text>
        <Text style={styles.meta}>
          {venue.category}
          {distanceMeters !== null ? ` · ${(distanceMeters / 1609).toFixed(1)} mi` : ''}
          {status?.waitEstimateMinutes != null ? ` · ~${status.waitEstimateMinutes} min wait` : ''}
        </Text>
        {venue.isFastPassPartner && <Text style={styles.fastPass}>Fast Pass available</Text>}
      </View>
      <CrowdLevelBadge level={status?.crowdLevel ?? null} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  info: { flex: 1, marginRight: 12 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: '#6E6E73', marginTop: 2, textTransform: 'capitalize' },
  fastPass: { fontSize: 12, color: '#5856D6', marginTop: 4, fontWeight: '500' },
});
