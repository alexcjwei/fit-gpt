import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { RootNavigator } from './RootNavigator';

// Deep linking configuration
const linking: LinkingOptions<any> = {
  prefixes: ['genworkout://', 'https://genworkout.app'],
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
      WorkoutEditor: 'workout/edit/:workoutId?',
      ExerciseSelector: 'exercise/select/:blockId',
      ExerciseDetails: 'exercise/:exerciseId',
      SetEditor: 'set/edit/:setId',
    },
  },
};

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
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
    backgroundColor: '#fff',
  },
});
