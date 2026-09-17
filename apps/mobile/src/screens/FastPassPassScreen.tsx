import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FastPassRedemption } from '@linez/shared';
import type { RootStackParamList } from '../navigation/types';
import { requestFastPassRedemption } from '../lib/api';

type Props = NativeStackScreenProps<RootStackParamList, 'FastPassPass'>;

export function FastPassPassScreen({ route }: Props) {
  const { venueId, venueName } = route.params;
  const [redemption, setRedemption] = useState<FastPassRedemption | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestFastPassRedemption(venueId)
      .then(setRedemption)
      .catch((err: Error) => setError(err.message));
  }, [venueId]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!redemption) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.meta}>Getting your Fast Pass...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.venueName}>{venueName}</Text>
      <Text style={styles.instructions}>Show this to door staff -- they'll scan it to let you in.</Text>
      <View style={styles.qrWrapper}>
        <QRCode value={redemption.redeemUrl} size={240} />
      </View>
      <Text style={styles.timestamp}>Issued {new Date(redemption.createdAt).toLocaleTimeString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  venueName: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  instructions: { fontSize: 14, color: '#6E6E73', textAlign: 'center', marginBottom: 24 },
  qrWrapper: { padding: 16, backgroundColor: '#fff', borderRadius: 16 },
  timestamp: { fontSize: 13, color: '#6E6E73', marginTop: 24 },
  error: { color: '#FF3B30', textAlign: 'center' },
  meta: { fontSize: 13, color: '#6E6E73', marginTop: 12 },
});
