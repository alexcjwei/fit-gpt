  Phase 4 Part 1: Calendar Screen - Implementation Plan

  Based on my analysis of the codebase and backend API, here's the detailed plan for implementing the Calendar Screen feature:

  ---
  Overview

  Implement a monthly calendar view that displays workout indicators on dates, allows date selection to view workouts from that day, and provides quick actions for creating/duplicating workouts.

  ---
  Tasks Breakdown

  1. Create TypeScript Types (frontend/src/types/workout.types.ts)

  - Copy core workout types from backend (Workout, WorkoutBlock, ExerciseInstance, SetInstance, Exercise)
  - Add frontend-specific types:
    - WorkoutSummary (for calendar view - id, name, date)
    - CalendarDateWorkouts (date → workouts mapping)
  - Define API response types for workout endpoints

  2. Create Workout API Layer (frontend/src/api/workout.api.ts)

  - Implement API functions:
    - getWorkoutsCalendar(startDate: string, endDate: string) → GET /api/workouts/calendar
    - getWorkout(id: string) → GET /api/workouts/:id
    - createWorkout(workout: Workout) → POST /api/workouts
    - duplicateWorkout(id: string, newDate?: string) → POST /api/workouts/:id/duplicate
  - Follow existing auth.api.ts pattern using apiClient

  3. Write Tests for Workout API (frontend/src/api/tests/workout.api.test.ts)

  - Test calendar data fetching with date ranges
  - Test single workout fetching
  - Test create workout
  - Test duplicate workout
  - Test error handling (401, 404, 500)
  - Follow existing auth.api.test.ts pattern

  4. Run API Tests

  - Execute: npm test workout.api.test.ts
  - Confirm all tests pass

  5. Install Calendar Library

  - Add react-native-calendars package
  - Run: npm install react-native-calendars
  - Add TypeScript types: npm install --save-dev @types/react-native-calendars

  6. Create Calendar Components

  a. WorkoutListModal Component (frontend/src/components/workout/WorkoutListModal.tsx)
  - Modal that displays workouts for a selected date
  - Props: visible, date, workouts, onClose, onSelectWorkout
  - List with workout cards showing name and time
  - "Create Workout" button at bottom
  - Close button/gesture

  b. WorkoutIndicator Component (frontend/src/components/workout/WorkoutIndicator.tsx)
  - Small dot/badge shown on calendar dates with workouts
  - Props: count (number of workouts)
  - Visual: colored dot, with number if count > 1

  7. Update CalendarScreen (frontend/src/screens/CalendarScreen.tsx)

  State Management:
  - Selected month/year
  - Selected date (for modal)
  - Calendar date range (current month ± 1 month for prefetching)
  - Modal visibility

  Data Fetching:
  - Use TanStack Query to fetch calendar data
  - Query key: ['workouts', 'calendar', startDate, endDate]
  - Fetch workouts for visible month range

  UI Elements:
  - Month/year header with navigation arrows
  - Calendar grid using react-native-calendars
  - Mark dates with workout indicators (dots)
  - Date tap handler → show WorkoutListModal
  - Floating Action Button (FAB) for "Create Workout"

  Interactions:
  - Tap date → Open WorkoutListModal with workouts from that date
  - Tap workout in modal → Navigate to WorkoutDetailsScreen
  - Tap "Create Workout" → Navigate to WorkoutEditorScreen (modal) with pre-filled date
  - Swipe/navigate between months → Fetch data for new range

  8. Create Mock Workout Data (for testing)

  - Add mock workout in WorkoutListModal initially
  - Mock workout structure matching backend types
  - Display mock workout when any date is tapped

  9. Update Navigation Types (frontend/src/types/navigation.types.ts)

  - Add params for WorkoutDetailsScreen: { workoutId: string }
  - Add params for WorkoutEditorScreen modal: { date?: string, duplicateFromId?: string }

  10. Handle Edge Cases

  - Empty state: No workouts for selected date → Show empty state with "Create Workout" CTA
  - Loading states: Show skeleton/spinner while fetching
  - Error states: Show error message with retry button
  - Offline handling: Show cached data if available

  11. Styling & Polish

  - Match app design system (use existing colors from LoginScreen)
  - Responsive layout (works on different screen sizes)
  - Smooth animations for modal open/close
  - Haptic feedback on interactions (if using expo-haptics)

  12. Type Check

  - Run: npm run type-check
  - Fix any TypeScript errors

  ---
  File Structure (New Files)

  frontend/src/
  ├── types/
  │   └── workout.types.ts          [NEW]
  ├── api/
  │   ├── workout.api.ts             [NEW]
  │   └── __tests__/
  │       └── workout.api.test.ts    [NEW]
  ├── components/
  │   └── workout/                   [NEW FOLDER]
  │       ├── WorkoutListModal.tsx   [NEW]
  │       └── WorkoutIndicator.tsx   [NEW]
  └── screens/
      └── CalendarScreen.tsx         [UPDATE]

  ---
  Dependencies to Install

  npm install react-native-calendars
  npm install --save-dev @types/react-native-calendars

  ---
  Success Criteria

  1. ✅ Calendar displays current month with navigation
  2. ✅ Dates with workouts show visual indicators (dots)
  3. ✅ Tapping a date opens modal with workout list (starting with Mock Workout)
  4. ✅ Tapping a workout navigates to WorkoutDetailsScreen
  5. ✅ "Create Workout" button pre-fills selected date
  6. ✅ Data fetches from backend API (GET /api/workouts/calendar)
  7. ✅ Loading, empty, and error states handled gracefully
  8. ✅ All TypeScript types pass checks
  9. ✅ API tests pass

  ---
  Implementation Order (Following BP-1, BP-2, BP-3)

  1. Types first (workout.types.ts)
  2. API layer (workout.api.ts)
  3. Write tests BEFORE implementation (workout.api.test.ts)
  4. Run tests to confirm failures (Red phase of TDD)
  5. Implement API functions (Green phase)
  6. Run tests to confirm pass
  7. Build UI components (WorkoutIndicator, WorkoutListModal)
  8. Update CalendarScreen (integrate calendar library + components)
  9. Manual testing (FE-3: state user interactions instead of writing component tests)
  10. Type check and refactor

  ---
  Manual Testing Checklist (FE-3)

  After implementation, manually test:
  - Calendar renders with current month
  - Navigate to previous/next month
  - Tap date with no workouts → See empty state
  - Mock workout appears in list when date is tapped
  - Tap mock workout → Navigates to WorkoutDetailsScreen
  - Close modal → Modal dismisses
  - "Create Workout" button → Pre-fills date correctly
  - Calendar dots appear on dates with workouts (once real data flows)
  - Loading spinner shows during data fetch
  - Error handling works (test by disconnecting from backend)

  ---
  Notes

  - Start with mock workout in the modal to validate navigation and UI
  - Real workout data will flow once the backend integration is tested
  - Focus on TDD for API layer (BP-2, TDD-1, TDD-2)
  - No component tests needed (FE-1), but thorough manual testing required
  - Update Swagger docs is backend-only, not needed here