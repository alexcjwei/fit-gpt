import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation.types';
import { BottomTabNavigator } from './BottomTabNavigator';

// Import modal screens
import { WorkoutEditorScreen } from '../screens/modals/WorkoutEditorScreen';
import { ExerciseSelectorScreen } from '../screens/modals/ExerciseSelectorScreen';
import { ExerciseDetailsScreen } from '../screens/modals/ExerciseDetailsScreen';
import { SetEditorScreen } from '../screens/modals/SetEditorScreen';

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

      {/* Full-screen modals (for WorkoutEditor and ExerciseSelector) */}
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
          name="WorkoutEditor"
          component={WorkoutEditorScreen}
          options={{ headerTitle: 'Edit Workout' }}
        />
        <Stack.Screen
          name="ExerciseSelector"
          component={ExerciseSelectorScreen}
          options={{ headerTitle: 'Add Exercise' }}
        />
      </Stack.Group>

      {/* Sheet-style modals (for ExerciseDetails and SetEditor) */}
      <Stack.Group
        screenOptions={{
          presentation: 'modal', // Modal presentation style for sheets
          headerShown: true, // Show header in modals
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#007AFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="ExerciseDetails"
          component={ExerciseDetailsScreen}
          options={{ headerTitle: 'Exercise Info' }}
        />
        <Stack.Screen
          name="SetEditor"
          component={SetEditorScreen}
          options={{ headerTitle: 'Edit Set' }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
};
