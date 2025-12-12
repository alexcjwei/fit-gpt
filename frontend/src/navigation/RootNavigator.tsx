import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation.types';
import { BottomTabNavigator } from './BottomTabNavigator';

// Import modal screens
import { ExerciseSelectorScreen } from '../screens/modals/ExerciseSelectorScreen';

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hide headers by default (tabs handle their own)
      }}
    >
      {/* Main app (bottom tabs) */}
      <Stack.Screen name="Main" component={BottomTabNavigator} />

      {/* Full-screen modals */}
      <Stack.Group
        screenOptions={{
          presentation: 'transparentModal', // Full screen presentation
          headerShown: true,
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#007AFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          cardStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
        <Stack.Screen
          name="ExerciseSelector"
          component={ExerciseSelectorScreen}
          options={{ headerTitle: 'Add Exercise' }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
};
