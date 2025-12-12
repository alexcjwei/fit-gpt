import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { RootNavigator } from './RootNavigator';
import { colors } from '../theme';

// Deep linking configuration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linking: LinkingOptions<any> = {
  prefixes: ['fitgpt://', 'https://fitgpt.app'],
  config: {
    screens: {
      // Auth screens
      Login: 'login',
      Register: 'register',

      // Main app (authenticated screens)
      Main: {
        screens: {
          // Bottom tabs
          Calendar: {
            screens: {
              CalendarScreen: 'calendar',
              WorkoutDetailsScreen: 'calendar/workout/:workoutId',
            },
          },
          Workouts: {
            screens: {
              WorkoutListScreen: 'workouts',
              WorkoutDetailsScreen: 'workouts/:workoutId',
            },
          },
          AI: 'ai',
          Profile: {
            screens: {
              ProfileScreen: 'profile',
              ExerciseBrowserScreen: 'profile/exercises',
              SettingsScreen: 'profile/settings',
            },
          },
        },
      },

      // Modals (Root level)
      ExerciseSelector: 'exercise/select/:blockId',
    },
  },
};

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? <RootNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
});
