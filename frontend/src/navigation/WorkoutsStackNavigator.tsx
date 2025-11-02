import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { WorkoutsStackParamList } from '../types/navigation.types';
import { WorkoutListScreen } from '../screens/WorkoutListScreen';
import { WorkoutDetailsScreen } from '../screens/WorkoutDetailsScreen';

const Stack = createStackNavigator<WorkoutsStackParamList>();

export const WorkoutsStackNavigator: React.FC = () => {
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
        name="WorkoutListScreen"
        component={WorkoutListScreen}
        options={{
          headerTitle: 'Workouts',
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
