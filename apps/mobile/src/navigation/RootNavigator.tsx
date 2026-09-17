import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { VenueDetailScreen } from '../screens/VenueDetailScreen';
import { SubmitReportScreen } from '../screens/SubmitReportScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Linez' }} />
        <Stack.Screen name="VenueDetail" component={VenueDetailScreen} options={{ title: 'Venue' }} />
        <Stack.Screen name="SubmitReport" component={SubmitReportScreen} options={{ title: 'Submit report' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
