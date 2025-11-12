import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { CalendarStackParamList } from '../types/navigation.types';
import { CalendarScreen } from '../screens/CalendarScreen';
import { WorkoutDetailsScreen } from '../screens/WorkoutDetailsScreen';

const Stack = createStackNavigator<CalendarStackParamList>();

export const CalendarStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
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
        name="CalendarScreen"
        component={CalendarScreen}
        options={{
          headerTitle: 'Calendar',
        }}
      />
      <Stack.Screen
        name="WorkoutDetailsScreen"
        component={WorkoutDetailsScreen}
        options={{
          headerTitle: 'Workout Details',
        }}
      />
    </Stack.Navigator>
  );
};
