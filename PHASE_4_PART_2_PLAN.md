# Phase 4 Part 2: Workout List Screen - Implementation Plan

## Overview

Implement a comprehensive workout list screen with infinite scroll/pagination, filtering, pull-to-refresh, and swipe actions. This plan also explores the possibility of **combining the Calendar and Workouts views** into a unified screen with a view mode toggle.

---

## Analysis: Can Calendar & Workouts Be Combined?

After examining the existing `CalendarScreen.tsx` and `WorkoutListScreen.tsx`, here's the assessment:

### Similarities:
- **Both display workouts** from the same data source (`GET /api/workouts/calendar`)
- **Both use React Query** for data fetching with caching
- **Both use WorkoutListModal** to show workouts when a date/workout is selected
- **Both have FAB** for creating new workouts
- **Both navigate to WorkoutDetailsScreen** when a workout is tapped

### Differences:
- **Calendar**: Shows monthly grid view, date-based navigation, visual workout indicators
- **Workout List**: Should show chronological list, infinite scroll, date filters, swipe actions

### Recommendation: **Keep Separate BUT Share Components**

While they could technically be combined with a toggle, **keeping them separate provides better UX**:
- Calendar users expect a **monthly grid** for date-based planning
- Workout list users expect a **scrollable feed** for browsing history
- Different interaction patterns (tap date vs scroll list)
- Different filtering needs (month navigation vs date range filters)

**Instead**, we should:
1. **Extract shared logic** into custom hooks (e.g., `useWorkoutsData`)
2. **Reuse WorkoutListModal** (already done)
3. **Create reusable WorkoutCard component** for both screens
4. **Share filtering/sorting utilities**

---

## Architecture Plan

### Shared Components & Hooks

```
frontend/src/
├── components/
│   └── workout/
│       ├── WorkoutCard.tsx              [NEW - Reusable workout display card]
│       ├── WorkoutListModal.tsx         [EXISTING - Already reusable]
│       └── WorkoutIndicator.tsx         [EXISTING - Calendar specific]
├── hooks/
│   ├── useWorkoutsData.ts               [NEW - Shared data fetching logic]
│   └── useWorkoutMutations.ts           [NEW - Shared mutations (duplicate, delete)]
└── utils/
    └── workoutFilters.ts                [NEW - Filter/sort utilities]
```

---

## Implementation Tasks

### 1. Create Shared Workout Data Hook (`frontend/src/hooks/useWorkoutsData.ts`)

**Purpose**: Centralize workout data fetching logic for both Calendar and List screens

**Features**:
- Fetch workouts by date range
- Support pagination (offset/limit)
- Support filtering by date range presets (7 days, 30 days, all)
- Return loading, error, and data states
- Integrate with React Query for caching

**API**:
```typescript
interface UseWorkoutsDataOptions {
  dateRange?: { startDate: string; endDate: string };
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

function useWorkoutsData(options: UseWorkoutsDataOptions) {
  // Returns: { data, isLoading, error, hasMore, fetchMore }
}
```

**Tests**: Write tests for the hook (`frontend/src/hooks/__tests__/useWorkoutsData.test.ts`)
- Test date range filtering
- Test pagination
- Test error handling
- Follow existing test patterns

---

### 2. Create Shared Workout Mutations Hook (`frontend/src/hooks/useWorkoutMutations.ts`)

**Purpose**: Centralize workout mutation logic (duplicate, delete)

**Features**:
- `duplicateWorkout(id, newDate)` mutation
- `deleteWorkout(id)` mutation
- Optimistic updates for React Query cache
- Success/error callbacks

**API**:
```typescript
function useWorkoutMutations() {
  return {
    duplicateWorkout: useMutation(...),
    deleteWorkout: useMutation(...),
  };
}
```

**Tests**: Write tests for the hook (`frontend/src/hooks/__tests__/useWorkoutMutations.test.ts`)
- Test duplicate mutation
- Test delete mutation
- Test optimistic updates
- Test error rollback

---

### 3. Create Reusable WorkoutCard Component (`frontend/src/components/workout/WorkoutCard.tsx`)

**Purpose**: Display workout summary in a card format (reusable in both List and Modal)

**Props**:
```typescript
interface WorkoutCardProps {
  workout: WorkoutSummary;
  onPress: (workoutId: string) => void;
  showDate?: boolean;        // Show date if viewing list
  showTime?: boolean;        // Show time if available
  enableSwipeActions?: boolean; // Enable swipe for duplicate/delete
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}
```

**Features**:
- Display workout name, date, time
- Tap to navigate to details
- Optional swipe actions (using `react-native-gesture-handler` and `react-native-reanimated`)
- Loading/disabled states

**Styling**:
- Match existing design system (same colors as `WorkoutListModal`)
- Support both modal and list contexts
- Swipe reveal actions (Duplicate = blue, Delete = red)

---

### 4. Add Swipe Actions Library

**Installation**:
```bash
npm install react-native-gesture-handler react-native-reanimated
npm install react-native-swipe-list-view
```

**Alternative**: Use `@gorhom/bottom-sheet` (already installed) or build custom swipe with `Animated` API

**Note**: Swipe actions should reveal:
- **Duplicate** button (blue, left swipe)
- **Delete** button (red, right swipe)

---

### 5. Update Workout API Layer (`frontend/src/api/workout.api.ts`)

**Add new functions**:
- `getWorkouts(params: { startDate?, endDate?, limit?, offset? })` → `GET /api/workouts`
- `deleteWorkout(id: string)` → `DELETE /api/workouts/:id`

**Update existing**:
- Ensure `duplicateWorkout` supports optional `newDate` parameter

**Tests**: Update `frontend/src/api/__tests__/workout.api.test.ts`
- Test `getWorkouts` with pagination
- Test `deleteWorkout`
- Test all error scenarios

---

### 6. Create Filter Utilities (`frontend/src/utils/workoutFilters.ts`)

**Purpose**: Utility functions for date range filtering

**Functions**:
```typescript
// Get date range presets
function getDateRangePreset(preset: 'week' | 'month' | 'all'): { startDate: string; endDate: string };

// Format dates for display
function formatWorkoutDate(date: string): string;

// Group workouts by date
function groupWorkoutsByDate(workouts: WorkoutSummary[]): { [date: string]: WorkoutSummary[] };
```

**Tests**: Write unit tests (`frontend/src/utils/__tests__/workoutFilters.test.ts`)
- Test each preset returns correct date range
- Test date formatting
- Test grouping logic

---

### 7. Implement Workout List Screen (`frontend/src/screens/WorkoutListScreen.tsx`)

**State Management**:
- Selected date filter (7 days, 30 days, all)
- Pagination state (offset, limit)
- Pull-to-refresh state
- Selected workout for actions

**Data Fetching**:
- Use `useWorkoutsData` hook with selected date filter
- Implement infinite scroll with `onEndReached`
- Pull-to-refresh with `RefreshControl`

**UI Elements**:
- **Header**: Filter chips (7 days, 30 days, all) - horizontally scrollable
- **List**: FlatList with infinite scroll
  - Each item: WorkoutCard with swipe actions
  - Group by date headers (optional)
  - Loading indicator at bottom during pagination
- **Empty State**: "No workouts found" with CTA to create or parse workout
- **FAB**: "Create Workout" button (same as Calendar)

**Interactions**:
- Tap workout card → Navigate to WorkoutDetailsScreen
- Swipe left → Show Duplicate action
- Swipe right → Show Delete action (with confirmation)
- Pull down → Refresh workout list
- Scroll to bottom → Load more workouts (if available)
- Tap filter chip → Update date range and refetch

**Features**:
- Infinite scroll with pagination (fetch 20 workouts at a time)
- Date filters: Past 7 days (default), Past 30 days, All time
- Pull-to-refresh
- Swipe actions: Duplicate, Delete
- Empty state with CTA

---

### 8. Add Confirmation Dialog for Delete Action

**Component**: `frontend/src/components/ConfirmDialog.tsx`

**Purpose**: Reusable confirmation dialog for destructive actions

**Props**:
```typescript
interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean; // Red confirm button for delete actions
}
```

**Usage**:
```typescript
<ConfirmDialog
  visible={showDeleteConfirm}
  title="Delete Workout?"
  message="This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={handleConfirmDelete}
  onCancel={() => setShowDeleteConfirm(false)}
  destructive={true}
/>
```

---

### 9. Update Navigation Types (`frontend/src/types/navigation.types.ts`)

**Add params for WorkoutListScreen**:
```typescript
export type WorkoutsStackParamList = {
  WorkoutListScreen: undefined;
  WorkoutDetailsScreen: { workoutId: string };
};
```

No changes needed (already defined), but verify navigation flow works.

---

### 10. Refactor CalendarScreen to Use Shared Components

**Changes**:
- Replace inline workout display with `WorkoutCard` component
- Use `useWorkoutsData` hook (optional, only if it simplifies code)
- Use `useWorkoutMutations` for duplicate action (if adding duplicate to calendar)

**Goal**: Reduce code duplication and ensure consistent styling

---

### 11. Handle Edge Cases

**Loading States**:
- Initial load: Show loading spinner
- Pagination load: Show small loader at bottom of list
- Pull-to-refresh: Show refresh indicator

**Empty States**:
- No workouts for filter: Show empty state with "Create Workout" and "Parse Workout" CTAs
- Network error: Show error message with retry button

**Error States**:
- API errors: Show error toast/message
- Swipe action errors: Show error toast and rollback optimistic update

**Offline Handling**:
- Use React Query cache for offline viewing
- Show "offline" indicator if no connection
- Queue mutations when offline (future enhancement)

---

### 12. Styling & Polish

**Design System**:
- Use existing colors from `CalendarScreen` and `WorkoutListModal`
- Primary: `#007AFF` (iOS blue)
- Background: `#fff`
- Cards: `#f8f9fa`
- Text: `#333` (primary), `#666` (secondary)

**Animations**:
- Smooth swipe animations for delete/duplicate
- Fade-in for new items during pagination
- Pull-to-refresh bounce animation

**Accessibility**:
- Screen reader labels for all buttons
- Sufficient touch targets (minimum 44x44)
- Color contrast for text

---

### 13. Type Check

**Command**: `npm run type-check`

**Fix any TypeScript errors** related to:
- New hook signatures
- Component props
- Navigation types

---

### 14. Manual Testing Checklist (FE-3)

After implementation, manually test:

**Basic Functionality**:
- [ ] Workout list displays with default filter (7 days)
- [ ] Tap workout card → Navigates to WorkoutDetailsScreen
- [ ] FAB → Opens WorkoutEditor with today's date

**Filtering**:
- [ ] Tap "7 days" filter → Shows last 7 days of workouts
- [ ] Tap "30 days" filter → Shows last 30 days
- [ ] Tap "All" filter → Shows all workouts

**Pagination**:
- [ ] Scroll to bottom → Loads more workouts (if available)
- [ ] Loading indicator appears during pagination
- [ ] No duplicate workouts appear

**Pull-to-Refresh**:
- [ ] Pull down → Refresh indicator appears
- [ ] List updates with latest data
- [ ] Refresh indicator disappears

**Swipe Actions**:
- [ ] Swipe left on workout → Duplicate button appears
- [ ] Tap duplicate → Creates copy with confirmation toast
- [ ] Swipe right on workout → Delete button appears
- [ ] Tap delete → Shows confirmation dialog
- [ ] Confirm delete → Workout removed from list
- [ ] Cancel delete → Workout remains in list

**Empty State**:
- [ ] Filter with no workouts → Shows empty state
- [ ] Empty state CTA buttons navigate correctly

**Error Handling**:
- [ ] Disconnect backend → Shows error message
- [ ] Retry button works
- [ ] Failed mutations show error toast

**Performance**:
- [ ] List scrolls smoothly (60fps)
- [ ] Swipe gestures feel responsive
- [ ] No lag during pagination

---

## File Structure Summary

### New Files:
```
frontend/src/
├── components/
│   ├── workout/
│   │   └── WorkoutCard.tsx              [NEW]
│   └── ConfirmDialog.tsx                [NEW]
├── hooks/
│   ├── useWorkoutsData.ts               [NEW]
│   ├── useWorkoutMutations.ts           [NEW]
│   └── __tests__/
│       ├── useWorkoutsData.test.ts      [NEW]
│       └── useWorkoutMutations.test.ts  [NEW]
├── utils/
│   ├── workoutFilters.ts                [NEW]
│   └── __tests__/
│       └── workoutFilters.test.ts       [NEW]
```

### Updated Files:
```
frontend/src/
├── api/
│   ├── workout.api.ts                   [UPDATE - Add getWorkouts, deleteWorkout]
│   └── __tests__/
│       └── workout.api.test.ts          [UPDATE - Add new tests]
├── screens/
│   ├── WorkoutListScreen.tsx            [UPDATE - Full implementation]
│   └── CalendarScreen.tsx               [UPDATE - Use WorkoutCard component]
```

---

## Dependencies to Install

```bash
# For swipe gestures (may already be installed)
npm install react-native-gesture-handler react-native-reanimated

# Alternative for swipe list
npm install react-native-swipe-list-view

# Check if already installed (likely yes from Phase 1):
# - react-native-gesture-handler
# - react-native-reanimated
```

---

## Success Criteria

1. ✅ Workout list displays workouts in reverse chronological order
2. ✅ Filter chips work (7 days, 30 days, all)
3. ✅ Infinite scroll loads more workouts when scrolling to bottom
4. ✅ Pull-to-refresh updates workout list
5. ✅ Swipe left → Duplicate workout
6. ✅ Swipe right → Delete workout (with confirmation)
7. ✅ Empty state displays when no workouts found
8. ✅ Tapping workout navigates to WorkoutDetailsScreen
9. ✅ FAB creates new workout with today's date
10. ✅ Loading, empty, and error states handled gracefully
11. ✅ All TypeScript types pass checks
12. ✅ API tests pass for new functions
13. ✅ Smooth animations and responsive gestures

---

## Implementation Order (Following BP-1, BP-2, BP-3, TDD)

### Phase 1: Shared Utilities & API Layer
1. Create `workoutFilters.ts` utilities
2. Write tests for `workoutFilters.ts`
3. Run tests (confirm they pass)
4. Update `workout.api.ts` (add `getWorkouts`, `deleteWorkout`)
5. Write tests for new API functions
6. Run tests (Red → Green → Refactor)
7. Type check

### Phase 2: Shared Hooks
8. Create `useWorkoutsData.ts` hook
9. Write tests for `useWorkoutsData`
10. Run tests (Red → Green → Refactor)
11. Create `useWorkoutMutations.ts` hook
12. Write tests for `useWorkoutMutations`
13. Run tests (Red → Green → Refactor)
14. Type check

### Phase 3: Reusable Components
15. Create `WorkoutCard.tsx` component (without swipe first)
16. Create `ConfirmDialog.tsx` component
17. Type check
18. Manual test components in isolation

### Phase 4: Swipe Actions
19. Install swipe gesture libraries
20. Add swipe actions to `WorkoutCard.tsx`
21. Manual test swipe gestures

### Phase 5: Workout List Screen
22. Implement `WorkoutListScreen.tsx` with all features
23. Integrate all shared components and hooks
24. Type check
25. Manual testing (follow checklist above)

### Phase 6: Refactor Calendar Screen
26. Update `CalendarScreen.tsx` to use `WorkoutCard`
27. Type check
28. Manual test calendar still works

### Phase 7: Polish & Edge Cases
29. Handle all edge cases (loading, empty, error states)
30. Add animations and polish
31. Final type check
32. Final manual testing
33. Performance testing (scroll smoothness)

---

## Notes

- **Do NOT write tests for React components** (FE-1) - only for hooks, utils, and API
- **State user interactions for manual testing** instead of component tests (FE-3)
- **Write tests BEFORE implementation** for utils, hooks, and API (BP-3, TDD-1)
- **Get user approval for this plan** before implementing (BP-2)
- **Keep Calendar and List screens separate** but share components/logic
- **Focus on smooth UX**: 60fps scrolling, responsive swipes, clear feedback
- **Reuse existing patterns**: Follow `CalendarScreen` and `WorkoutListModal` patterns for consistency

---

## Future Enhancements (Not in this phase)

- Search/filter by workout name
- Sort options (date, name, duration)
- Bulk actions (select multiple workouts)
- Export workouts
- Workout statistics/insights on list
- Drag-to-reorder workouts
- Archive/unarchive workouts
- Tags/categories for workouts
