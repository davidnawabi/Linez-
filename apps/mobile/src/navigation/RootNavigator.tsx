import React from 'react';
import { Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { VenueDetailScreen } from '../screens/VenueDetailScreen';
import { SubmitReportScreen } from '../screens/SubmitReportScreen';
import { FastPassScreen } from '../screens/FastPassScreen';
import { FastPassPassScreen } from '../screens/FastPassPassScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: 'Linez',
            headerRight: () => <Button title="Fast Pass" onPress={() => navigation.navigate('FastPass')} />,
          })}
        />
        <Stack.Screen name="VenueDetail" component={VenueDetailScreen} options={{ title: 'Venue' }} />
        <Stack.Screen name="SubmitReport" component={SubmitReportScreen} options={{ title: 'Submit report' }} />
        <Stack.Screen name="FastPass" component={FastPassScreen} options={{ title: 'Fast Pass' }} />
        <Stack.Screen name="FastPassPass" component={FastPassPassScreen} options={{ title: 'Your Pass' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
