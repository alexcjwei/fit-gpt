import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabParamList } from '../types/navigation.types';
import { CalendarStackNavigator } from './CalendarStackNavigator';
import { WorkoutsStackNavigator } from './WorkoutsStackNavigator';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import { AIScreen } from '../screens/AIScreen';
import { colors, shadows } from '../theme';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Hide all headers - screens will have integrated titles
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarShowLabel: false, // Icon-only tabs for cleaner design
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          height: 56 + insets.bottom,
          ...shadows.small,
        },
      }}
    >
      <Tab.Screen
        name="Calendar"
        component={CalendarStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 28, color }}>📅</Text>,
        }}
      />
      <Tab.Screen
        name="Workouts"
        component={WorkoutsStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 28, color }}>💪</Text>,
        }}
      />
      <Tab.Screen
        name="AI"
        component={AIScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 28, color }}>✨</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 28, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};
