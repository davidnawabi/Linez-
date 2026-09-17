import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { Subscription } from '@linez/shared';
import { createFastPassCheckout, fetchSubscription } from '../lib/api';

export function FastPassScreen() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingCheckout, setStartingCheckout] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchSubscription()
      .then(setSubscription)
      .catch((err: Error) => Alert.alert('Could not load Fast Pass status', err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSubscribe = async () => {
    setStartingCheckout(true);
    try {
      const checkoutUrl = await createFastPassCheckout();
      await WebBrowser.openBrowserAsync(checkoutUrl);
      // The subscription itself is created by the Stripe webhook once
      // payment completes, which can land slightly after the browser
      // closes -- refreshing here is a best-effort convenience, not the
      // source of truth.
      load();
    } catch (err) {
      Alert.alert('Could not start checkout', (err as Error).message);
    } finally {
      setStartingCheckout(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fast Pass</Text>

      {subscription && subscription.status === 'active' ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Active subscription</Text>
          <Text style={styles.passesRemaining}>{subscription.passesRemaining} passes remaining this month</Text>
          {subscription.renewalDate && <Text style={styles.meta}>Renews {subscription.renewalDate}</Text>}
        </View>
      ) : (
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>No active subscription</Text>
          <Text style={styles.meta}>Subscribe to skip the line at partner venues.</Text>
          <View style={styles.subscribeButton}>
            <Button
              title={startingCheckout ? 'Opening checkout...' : 'Subscribe'}
              onPress={onSubscribe}
              disabled={startingCheckout}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  statusCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
  },
  statusLabel: { fontSize: 16, fontWeight: '600' },
  passesRemaining: { fontSize: 15, marginTop: 8 },
  meta: { fontSize: 13, color: '#6E6E73', marginTop: 8 },
  subscribeButton: { marginTop: 16 },
});
