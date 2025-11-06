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

// Workouts Stack Navigator Param List
export type WorkoutsStackParamList = {
  WorkoutListScreen: undefined;
  WorkoutDetailsScreen: { workoutId: string };
};

// Profile Stack Navigator Param List
export type ProfileStackParamList = {
  ProfileScreen: undefined;
  ExerciseBrowserScreen: undefined;
  SettingsScreen: undefined;
};

// Bottom Tab Navigator Param List
export type BottomTabParamList = {
  Calendar: undefined;
  Workouts: undefined;
  AI: undefined;
  Profile: undefined;
};

// Root Stack Navigator Param List (modals)
export type RootStackParamList = {
  Main: undefined; // The main bottom tab navigator
  WorkoutEditor: {
    workoutId?: string;
    mode: 'create' | 'edit';
    date?: string; // ISO date string for pre-filling when creating
    duplicateFromId?: string; // Workout ID to duplicate from
  };
  ExerciseSelector: { blockId: string }; // which block to add exercise to
  ExerciseDetails: { exerciseId: string }; // which exercise to display
  SetEditor: { setId: string }; // which set to edit
};

// Declare global types for React Navigation
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
