import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CrowdLevel } from '@linez/shared';
import { CROWD_LEVELS } from '@linez/shared';
import type { RootStackParamList } from '../navigation/types';
import { useUserLocation } from '../hooks/useUserLocation';
import { submitReport } from '../lib/api';
import { SegmentedToggle } from '../components/SegmentedToggle';

type Props = NativeStackScreenProps<RootStackParamList, 'SubmitReport'>;

export function SubmitReportScreen({ route, navigation }: Props) {
  const { venueId } = route.params;
  const { location } = useUserLocation();
  const [crowdLevel, setCrowdLevel] = useState<CrowdLevel>('moderate');
  const [waitMinutes, setWaitMinutes] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!location) {
      Alert.alert('Location required', 'Enable location access to submit a report.');
      return;
    }

    setSubmitting(true);
    try {
      await submitReport({
        venueId,
        crowdLevel,
        waitEstimateMinutes: waitMinutes ? Number(waitMinutes) : null,
        note: note || undefined,
        reportedFrom: location,
      });
      Alert.alert('Thanks!', 'Your report was submitted.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not submit report', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Crowd level</Text>
      <SegmentedToggle
        options={CROWD_LEVELS.map((level) => ({ value: level, label: level }))}
        value={crowdLevel}
        onChange={setCrowdLevel}
      />

      <Text style={styles.label}>Wait time (minutes, optional)</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="e.g. 15"
        value={waitMinutes}
        onChangeText={setWaitMinutes}
      />

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Cover charge, dress code, etc."
        value={note}
        onChangeText={setNote}
      />

      <View style={styles.submitButton}>
        <Button title={submitting ? 'Submitting...' : 'Submit report'} onPress={onSubmit} disabled={submitting} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  submitButton: { marginTop: 32 },
});
