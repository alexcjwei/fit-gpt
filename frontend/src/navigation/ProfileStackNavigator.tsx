import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { ProfileStackParamList } from '../types/navigation.types';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ExerciseBrowserScreen } from '../screens/ExerciseBrowserScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createStackNavigator<ProfileStackParamList>();

export const ProfileStackNavigator: React.FC = () => {
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
        name="ProfileScreen"
        component={ProfileScreen}
        options={{
          headerShown: false, // Integrated title in screen content
        }}
      />
      <Stack.Screen
        name="ExerciseBrowserScreen"
        component={ExerciseBrowserScreen}
        options={{
          headerTitle: 'Exercise Browser',
        }}
      />
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{
          headerTitle: 'Settings',
        }}
      />
    </Stack.Navigator>
  );
};
