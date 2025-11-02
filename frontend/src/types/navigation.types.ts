/**
 * Navigation Type Definitions
 *
 * This file contains all TypeScript type definitions for React Navigation.
 * It enables type-safe navigation throughout the app.
 */

// Calendar Stack Navigator Param List
export type CalendarStackParamList = {
  CalendarScreen: undefined;
  WorkoutDetailsScreen: { workoutId: string };
};

// Bottom Tab Navigator Param List
export type BottomTabParamList = {
  Calendar: undefined;
  Workouts: undefined;
  AI: undefined;
  Profile: undefined;
};

// Declare global types for React Navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends BottomTabParamList {}
  }
}
