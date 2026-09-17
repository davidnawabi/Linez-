import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useVenues } from '../hooks/useVenues';
import { useUserLocation } from '../hooks/useUserLocation';
import { distanceMeters } from '../lib/geofence';
import { crowdLevelColor } from '../components/CrowdLevelBadge';
import { VenueListItem } from '../components/VenueListItem';
import { SegmentedToggle } from '../components/SegmentedToggle';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type ViewMode = 'map' | 'list';

export function HomeScreen({ navigation }: Props) {
  const [mode, setMode] = useState<ViewMode>('map');
  const { venues, statuses, loading, error, refresh } = useVenues();
  const { location, permissionDenied } = useUserLocation();

  const sortedByDistance = useMemo(() => {
    if (!location) return venues;
    return [...venues].sort(
      (a, b) => distanceMeters(location, a.location) - distanceMeters(location, b.location),
    );
  }, [venues, location]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.retry} onPress={refresh}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SegmentedToggle
          options={[
            { value: 'map', label: 'Map' },
            { value: 'list', label: 'List' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>

      {permissionDenied && (
        <Text style={styles.notice}>
          Location access is off -- distance sorting is disabled and you won't be able to submit reports
          until it's enabled.
        </Text>
      )}

      {mode === 'map' ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location?.latitude ?? venues[0]?.location.latitude ?? 40.7484,
            longitude: location?.longitude ?? venues[0]?.location.longitude ?? -73.9857,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
        >
          {venues.map((venue) => (
            <Marker
              key={venue.id}
              coordinate={venue.location}
              pinColor={crowdLevelColor(statuses[venue.id]?.crowdLevel ?? null)}
              title={venue.name}
              description={
                statuses[venue.id]?.waitEstimateMinutes != null
                  ? `~${statuses[venue.id].waitEstimateMinutes} min wait`
                  : 'No recent reports'
              }
              onCalloutPress={() => navigation.navigate('VenueDetail', { venueId: venue.id })}
            />
          ))}
        </MapView>
      ) : (
        <FlatList
          data={sortedByDistance}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => (
            <VenueListItem
              venue={item}
              status={statuses[item.id]}
              distanceMeters={location ? distanceMeters(location, item.location) : null}
              onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
            />
          )}
          onRefresh={refresh}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#FF3B30', textAlign: 'center', marginBottom: 8 },
  retry: { color: '#5856D6', fontWeight: '600' },
  notice: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 13, color: '#FF9500' },
});
