import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CrowdLevel } from '@linez/shared';

const COLORS: Record<CrowdLevel, string> = {
  empty: '#8E8E93',
  light: '#34C759',
  moderate: '#FFCC00',
  busy: '#FF9500',
  packed: '#FF3B30',
};

const LABELS: Record<CrowdLevel, string> = {
  empty: 'Empty',
  light: 'Light',
  moderate: 'Moderate',
  busy: 'Busy',
  packed: 'Packed',
};

export function crowdLevelColor(level: CrowdLevel | null): string {
  return level ? COLORS[level] : '#C7C7CC';
}

export function CrowdLevelBadge({ level }: { level: CrowdLevel | null }) {
  return (
    <View style={[styles.badge, { backgroundColor: crowdLevelColor(level) }]}>
      <Text style={styles.text}>{level ? LABELS[level] : 'No data'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
