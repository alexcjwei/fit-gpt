import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabParamList } from '../types/navigation.types';
import { CalendarStackNavigator } from './CalendarStackNavigator';
import { WorkoutListScreen } from '../screens/WorkoutListScreen';
import { AIScreen } from '../screens/AIScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Calendar"
        component={CalendarStackNavigator}
        options={{
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>📅</Text>
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Workouts"
        component={WorkoutListScreen}
        options={{
          tabBarLabel: 'Workouts',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>💪</Text>
          ),
          headerTitle: 'Workouts',
        }}
      />
      <Tab.Screen
        name="AI"
        component={AIScreen}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>✨</Text>
          ),
          headerTitle: 'AI Assistant',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>👤</Text>
          ),
          headerTitle: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};
