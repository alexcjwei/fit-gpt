# Phase 4 Part 3: Workout Details Screen - Implementation Plan

## Overview

Implement a comprehensive Workout Details Screen with two distinct modes:
1. **View Mode**: Display workout details, blocks, exercises, and sets with completion tracking
2. **Edit Mode**: Inline editing of workout structure (add/remove/reorder blocks and exercises)

This plan follows the project's **Model-Controller-Service** pattern, **TDD workflow**, and ensures proper integration with existing backend APIs.

---

## Architecture Analysis

### Existing Components (Reusable)
✅ `WorkoutCard` - For displaying workout summaries (not needed here)
✅ `ConfirmDialog` - For delete confirmations
✅ `workoutFilters.ts` - Date formatting utilities
✅ `useWorkoutMutations` - Duplicate/delete mutations

### Backend API Endpoints (from `/backend/src/routes/workout.routes.ts`)

**Workout-level:**
- `GET /api/workouts/:id` → Full workout with all blocks, exercises, sets
- `PUT /api/workouts/:id` → Update workout name, date, notes
- `POST /api/workouts/:id/start` → Start workout (sets startTime)
- `POST /api/workouts/:id/duplicate` → Duplicate workout
- `DELETE /api/workouts/:id` → Delete workout

**Block-level:**
- `POST /api/workouts/:workoutId/blocks` → Add block
- `DELETE /api/workouts/blocks/:blockId` → Remove block
- `PUT /api/workouts/:workoutId/blocks/reorder` → Reorder blocks

**Exercise-level:**
- `POST /api/workouts/blocks/:blockId/exercises` → Add exercise to block
- `DELETE /api/workouts/exercises/:exerciseId` → Remove exercise
- `PUT /api/workouts/blocks/:blockId/exercises/reorder` → Reorder exercises

**Set-level:**
- `PUT /api/workouts/sets/:setId` → Update set data (weight, reps, etc.)
- `POST /api/workouts/sets/:setId/complete` → Mark set as completed

### Data Structure (from `/frontend/src/types/workout.types.ts`)

```typescript
Workout {
  id: string
  name: string
  date: string // ISO 8601 (YYYY-MM-DD)
  startTime?: string // ISO 8601 timestamp
  lastModifiedTime: string // ISO 8601 timestamp
  notes?: string
  blocks: WorkoutBlock[]
}

WorkoutBlock {
  id: string
  label?: string // "Warm Up", "Superset A", etc.
  exercises: ExerciseInstance[]
  restPeriod?: string // "2-3 min", "90 sec"
  notes?: string
}

ExerciseInstance {
  id: string
  exerciseId: string // Reference to Exercise model
  orderInBlock: number // 0-indexed
  sets: SetInstance[]
  restPeriod?: string
  notes?: string
}

SetInstance {
  id: string
  setNumber: number // 1-indexed
  targetRepsMin?: number
  targetRepsMax?: number
  actualReps?: number
  targetWeight?: number
  actualWeight?: number
  weightUnit: 'lbs' | 'kg'
  duration?: number // seconds for time-based exercises
  rpe?: number // 1-10
  completed: boolean
  completedAt?: string // ISO 8601 timestamp
  notes?: string
}
```

---

## Implementation Tasks

### Phase 1: API Layer Extensions

#### 1.1 Extend Workout API (`frontend/src/api/workout.api.ts`)

**Add new functions:**
```typescript
// Update workout details (name, date, notes)
updateWorkout(id: string, updates: Partial<Workout>): Promise<Workout>

// Start workout (sets startTime)
startWorkout(id: string): Promise<Workout>

// Block operations
addBlock(workoutId: string, block: WorkoutBlock): Promise<Workout>
removeBlock(blockId: string): Promise<Workout>
reorderBlocks(workoutId: string, blockOrders: Array<{ blockId: string; order: number }>): Promise<Workout>

// Exercise operations
addExercise(blockId: string, exercise: ExerciseInstance): Promise<Workout>
removeExercise(exerciseId: string): Promise<Workout>
reorderExercises(blockId: string, exerciseOrders: Array<{ exerciseId: string; order: number }>): Promise<Workout>

// Set operations
updateSet(setId: string, updates: Partial<SetInstance>): Promise<Workout>
completeSet(setId: string, data: { actualReps?: number; actualWeight?: number; rpe?: number; notes?: string }): Promise<Workout>
```

**Tests**: `frontend/src/api/__tests__/workout.api.test.ts`
- Test each new API function with expected input/output
- Test error handling (401, 404, 500)
- Follow existing test patterns (auth.api.test.ts)
- Run tests: `npm test workout.api.test.ts` (from frontend/)

#### 1.2 Create Exercise API Layer (`frontend/src/api/exercise.api.ts`)

**Functions:**
```typescript
// Get single exercise by ID (for displaying exercise details)
getExercise(id: string): Promise<Exercise>

// Search exercises (for ExerciseSelector modal)
searchExercises(query: string): Promise<Exercise[]>
```

**Tests**: `frontend/src/api/__tests__/exercise.api.test.ts`
- Test exercise fetching
- Test search functionality
- Test error handling

---

### Phase 2: Custom Hooks for Data Fetching

#### 2.1 Create `useWorkout` Hook (`frontend/src/hooks/useWorkout.ts`)

**Purpose**: Fetch and cache single workout data

```typescript
interface UseWorkoutOptions {
  workoutId: string;
  enabled?: boolean;
}

function useWorkout({ workoutId, enabled = true }: UseWorkoutOptions) {
  // Use React Query to fetch workout
  // Query key: ['workout', workoutId]
  // Return: { workout, isLoading, error, refetch }
}
```

**No tests needed** (FE-1: Don't write tests for hooks that are React Query wrappers)

#### 2.2 Create `useWorkoutActions` Hook (`frontend/src/hooks/useWorkoutActions.ts`)

**Purpose**: Centralize all workout mutation operations

```typescript
function useWorkoutActions(workoutId: string) {
  return {
    // Workout-level
    updateWorkout: useMutation(...),
    startWorkout: useMutation(...),
    deleteWorkout: useMutation(...),
    duplicateWorkout: useMutation(...),

    // Block-level
    addBlock: useMutation(...),
    removeBlock: useMutation(...),
    reorderBlocks: useMutation(...),

    // Exercise-level
    addExercise: useMutation(...),
    removeExercise: useMutation(...),
    reorderExercises: useMutation(...),

    // Set-level
    updateSet: useMutation(...),
    completeSet: useMutation(...),
  };
}
```

**No tests needed** (FE-1: Don't write tests for React components/hooks)

---

### Phase 3: Reusable UI Components

#### 3.1 Create `SetRow` Component (`frontend/src/components/workout/SetRow.tsx`)

**Purpose**: Display a single set with completion checkbox

**Props:**
```typescript
interface SetRowProps {
  set: SetInstance;
  setNumber: number;
  onToggleComplete: (setId: string, completed: boolean) => void;
  onEdit?: (setId: string) => void; // Optional: for opening SetEditor modal
  readOnly?: boolean; // View mode vs Active mode
}
```

**Features:**
- Display set number, target/actual reps, target/actual weight
- Checkbox for completion toggle
- Show RPE badge if available
- Tap to edit (opens SetEditor modal in active workout mode)
- Display completedAt timestamp (if completed)

**Styling:**
- Completed sets: light green background, strikethrough
- Incomplete sets: white background
- RPE badge: color-coded (1-3: green, 4-6: yellow, 7-8: orange, 9-10: red)

**No tests needed** (FE-1)

#### 3.2 Create `ExerciseCard` Component (`frontend/src/components/workout/ExerciseCard.tsx`)

**Purpose**: Display exercise with its sets in a workout block

**Props:**
```typescript
interface ExerciseCardProps {
  exercise: ExerciseInstance;
  exerciseName: string; // Fetched from Exercise model
  onToggleSetComplete: (setId: string, completed: boolean) => void;
  onEditSet?: (setId: string) => void;
  onRemove?: () => void; // Edit mode only
  readOnly?: boolean;
}
```

**Features:**
- Display exercise name, notes (if any), rest period (if any)
- List all sets using SetRow component
- "Remove Exercise" button (edit mode only)
- Drag handle for reordering (edit mode only, future enhancement)

**Styling:**
- Card with border and padding
- Exercise name: bold, 18pt
- Rest period: secondary text below sets
- Progress indicator: "3/5 sets completed"

**No tests needed** (FE-1)

#### 3.3 Create `BlockCard` Component (`frontend/src/components/workout/BlockCard.tsx`)

**Purpose**: Display a workout block with all exercises

**Props:**
```typescript
interface BlockCardProps {
  block: WorkoutBlock;
  exerciseNames: { [exerciseId: string]: string }; // Map of exerciseId → name
  onToggleSetComplete: (setId: string, completed: boolean) => void;
  onEditSet?: (setId: string) => void;
  onRemoveExercise?: (exerciseId: string) => void;
  onRemoveBlock?: () => void;
  onAddExercise?: () => void;
  readOnly?: boolean;
}
```

**Features:**
- Display block label (if any): "Warm Up", "Superset A", etc.
- Display block rest period (if any)
- Display block notes (if any)
- List all exercises using ExerciseCard component
- "Add Exercise" button (edit mode only)
- "Remove Block" button (edit mode only)
- Drag handle for reordering (edit mode only, future enhancement)

**Styling:**
- Section with header and border
- Block label: bold, 20pt
- Rest period: badge at top-right
- Exercises: stacked vertically with spacing

**No tests needed** (FE-1)

#### 3.4 Create `RestTimer` Component (`frontend/src/components/workout/RestTimer.tsx`)

**Purpose**: Countdown timer for rest periods between sets

**Props:**
```typescript
interface RestTimerProps {
  duration: number; // seconds
  onComplete: () => void;
  onCancel: () => void;
}
```

**Features:**
- Circular progress indicator
- Large countdown display (e.g., "1:30")
- "Skip" button
- "Add 30s" button
- Auto-complete when timer reaches 0
- Sound/vibration on completion (using expo-haptics)

**Styling:**
- Full-screen modal overlay
- Centered circular timer
- Large, easy-to-read numbers

**No tests needed** (FE-1)

---

### Phase 4: Main Screen Implementation

#### 4.1 Implement `WorkoutDetailsScreen` - View Mode

**File**: `frontend/src/screens/WorkoutDetailsScreen.tsx`

**State Management:**
```typescript
const [editMode, setEditMode] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [showRestTimer, setShowRestTimer] = useState(false);
const [restDuration, setRestDuration] = useState(0);
```

**Data Fetching:**
```typescript
const { workout, isLoading, error, refetch } = useWorkout({ workoutId });
const { exerciseNames } = useExerciseNames(workout?.blocks); // Custom hook to fetch exercise names
const {
  updateWorkout,
  deleteWorkout,
  duplicateWorkout,
  completeSet,
  ...
} = useWorkoutActions(workoutId);
```

**View Mode UI Structure:**

```
ScrollView
├── Header (Sticky)
│   ├── Back Button
│   ├── Workout Name (editable in edit mode)
│   └── More Menu (•••)
│       ├── Edit Workout
│       ├── Duplicate Workout
│       ├── Delete Workout
│       └── Cancel
│
├── Workout Info Section
│   ├── Date (formatted: "Monday, Nov 1, 2024")
│   ├── Start Time (if available)
│   └── Notes (if available)
│
├── Blocks Section
│   └── [For each block]
│       └── BlockCard component
│           ├── Block Label
│           ├── Rest Period badge
│           ├── [For each exercise]
│           │   └── ExerciseCard component
│           │       ├── Exercise Name
│           │       ├── [For each set]
│           │       │   └── SetRow component
│           │       │       ├── Checkbox (toggle completion)
│           │       │       ├── Set details
│           │       │       └── RPE badge
│           │       └── Rest Period
│           └── Block Notes
│
└── FAB (Floating Action Button) - Bottom Right
    ├── Start Workout (if not started)
    └── Edit Workout
```

**Interactions (View Mode):**
- Tap set checkbox → Toggle set completion (optimistic update via `completeSet`)
- Tap set row → Open SetEditor modal (view/edit set details)
- Tap "More Menu" → Show action sheet (Edit, Duplicate, Delete)
- Tap "Edit Workout" → Switch to edit mode
- Tap "Start Workout" → Call `startWorkout` API, navigate to ActiveWorkoutScreen (future)
- Tap "Duplicate" → Show date picker, call `duplicateWorkout`
- Tap "Delete" → Show ConfirmDialog, call `deleteWorkout`, navigate back

**Loading/Error States:**
- Loading: Show skeleton loader for blocks
- Error: Show error message with "Retry" button
- Empty workout (no blocks): Show empty state with "Add Block" CTA

#### 4.2 Implement `WorkoutDetailsScreen` - Edit Mode

**Edit Mode UI Changes:**
```
ScrollView
├── Header (Sticky)
│   ├── Cancel Button (exit edit mode, discard changes)
│   ├── Workout Name (inline TextInput)
│   └── Save Button (save changes)
│
├── Workout Info Section
│   ├── Date Picker (inline)
│   └── Notes TextInput (multiline)
│
├── Blocks Section
│   └── [For each block]
│       └── BlockCard (edit mode)
│           ├── Block Label TextInput
│           ├── Rest Period TextInput
│           ├── Drag Handle (for reordering - future)
│           ├── [For each exercise]
│           │   └── ExerciseCard (edit mode)
│           │       ├── Exercise Name (read-only)
│           │       ├── Remove Button
│           │       ├── Drag Handle (for reordering - future)
│           │       └── Sets (view-only in edit mode)
│           ├── "Add Exercise" Button
│           └── "Remove Block" Button
│
└── "Add Block" Button - Bottom
```

**Edit Mode State:**
- Use local state to track changes before saving
- Deep clone workout object to avoid mutating cached data
- On "Save": Send all changes to backend via `updateWorkout`
- On "Cancel": Discard changes, revert to cached data

**Interactions (Edit Mode):**
- Tap "Add Block" → Create new block with empty exercises array
- Tap "Remove Block" → Show ConfirmDialog, remove block from local state
- Tap "Add Exercise" → Open ExerciseSelector modal, add exercise to block
- Tap "Remove Exercise" → Show ConfirmDialog, remove exercise from block
- Tap "Save" → Validate, send updates to backend, exit edit mode
- Tap "Cancel" → Discard changes, exit edit mode

**Validation:**
- Workout name: required, min 3 chars
- Date: required, valid ISO format
- Block label: optional
- Exercise: must reference valid exerciseId

**Optimistic Updates:**
- Set completion: Update UI immediately, rollback on error
- Other mutations: Show loading spinner, update UI on success

---

### Phase 5: Helper Utilities

#### 5.1 Create `useExerciseNames` Hook (`frontend/src/hooks/useExerciseNames.ts`)

**Purpose**: Fetch exercise names for all exercises in a workout

```typescript
function useExerciseNames(blocks?: WorkoutBlock[]) {
  // Extract all unique exerciseIds from blocks
  // Fetch Exercise data for each exerciseId
  // Return: { exerciseNames: { [id: string]: string }, isLoading }
}
```

**Implementation:**
- Use React Query with `useQueries` to fetch multiple exercises
- Cache exercise data separately (don't refetch for each workout)
- Query key: `['exercise', exerciseId]`

**No tests needed** (FE-1)

#### 5.2 Create Validation Utilities (`frontend/src/utils/workoutValidation.ts`)

**Purpose**: Validate workout data before saving

```typescript
// Validate workout structure
validateWorkout(workout: Partial<Workout>): { valid: boolean; errors: string[] }

// Validate block structure
validateBlock(block: Partial<WorkoutBlock>): { valid: boolean; errors: string[] }

// Validate exercise instance
validateExercise(exercise: Partial<ExerciseInstance>): { valid: boolean; errors: string[] }
```

**Tests**: `frontend/src/utils/__tests__/workoutValidation.test.ts`
- Test valid workout passes
- Test invalid workout fails with correct errors
- Test edge cases (empty name, invalid date, etc.)
- Run tests: `npm test workoutValidation.test.ts` (from frontend/)

---

### Phase 6: Navigation & Modals Integration

#### 6.1 Update Navigation Types (`frontend/src/types/navigation.types.ts`)

**Add WorkoutDetailsScreen params (if not already there):**
```typescript
export type CalendarStackParamList = {
  CalendarScreen: undefined;
  WorkoutDetailsScreen: { workoutId: string };
};

export type WorkoutsStackParamList = {
  WorkoutListScreen: undefined;
  WorkoutDetailsScreen: { workoutId: string };
};
```

**Verify modal navigation params exist:**
```typescript
export type RootStackParamList = {
  // ... existing routes
  WorkoutEditor: { mode: 'create' | 'edit'; workoutId?: string; date?: string };
  ExerciseSelector: { blockId: string; onSelect?: (exerciseId: string) => void };
  ExerciseDetails: { exerciseId: string };
  SetEditor: { setId: string; onSave?: (data: Partial<SetInstance>) => void };
};
```

#### 6.2 Connect to Existing Modals

**WorkoutEditor Modal:**
- Open from "More Menu" → "Edit Workout"
- Pass `mode: 'edit'` and `workoutId`
- On save: Refetch workout data in WorkoutDetailsScreen

**ExerciseSelector Modal:**
- Open from "Add Exercise" button in edit mode
- Pass `blockId` and `onSelect` callback
- On select: Add exercise to block via `addExercise` mutation

**SetEditor Modal:**
- Open from tapping SetRow in view mode
- Pass `setId` and `onSave` callback
- On save: Update set via `updateSet` mutation

**ExerciseDetails Modal:**
- Open from tapping exercise name (future enhancement)
- Pass `exerciseId`
- Display exercise info, form cues, video

---

### Phase 7: Edge Cases & Error Handling

#### 7.1 Loading States
- Initial load: Show skeleton for blocks/exercises
- Mutation loading: Show spinner on affected component
- Refetching: Show subtle refresh indicator

#### 7.2 Error States
- Workout not found (404): Show error message, "Back to List" button
- Network error: Show error banner with "Retry" button
- Mutation error: Show toast notification, rollback optimistic update

#### 7.3 Empty States
- No blocks: "No exercises yet. Tap 'Add Block' to get started."
- No sets in exercise: "No sets defined."
- Workout deleted (navigated from stale link): Redirect to workout list

#### 7.4 Optimistic Updates
- Set completion: Update UI immediately, show checkmark animation
- If mutation fails: Rollback completion, show error toast
- Use React Query's `onMutate`, `onError`, and `onSettled` callbacks

#### 7.5 Offline Handling
- Use cached workout data when offline
- Show "Offline" badge in header
- Queue mutations when offline (future enhancement)

---

### Phase 8: Styling & Accessibility

#### 8.1 Design System
**Colors:**
- Primary: `#007AFF` (iOS blue)
- Background: `#fff`
- Cards: `#f8f9fa`
- Text: `#333` (primary), `#666` (secondary)
- Success: `#34C759` (green)
- Warning: `#FF9500` (orange)
- Error: `#FF3B30` (red)
- Completed set background: `#E8F5E9` (light green)

**Typography:**
- Workout name: 24pt, bold
- Block label: 20pt, bold
- Exercise name: 18pt, semibold
- Set details: 16pt, regular
- Secondary text: 14pt, regular

**Spacing:**
- Section padding: 16px
- Card margin: 8px vertical
- Card padding: 16px
- Set row padding: 12px

#### 8.2 Animations
- Set completion: Fade + scale animation
- Block expand/collapse: Smooth height transition (future)
- FAB: Bounce on tap
- Modal open/close: Slide from bottom

#### 8.3 Accessibility
- Screen reader labels for all interactive elements
- Sufficient color contrast (WCAG AA)
- Touch targets: minimum 44x44pt
- Keyboard navigation support (web)

---

## Implementation Order (Following TDD & BP Rules)

### **Phase 1: API Layer** (TDD Required)
1. Write tests for new API functions (`workout.api.test.ts`)
2. Run tests (confirm RED - failures)
3. Implement API functions in `workout.api.ts`
4. Run tests (confirm GREEN - passes)
5. Refactor if needed
6. Type check: `npm run type-check`

### **Phase 2: Utilities** (TDD Required for validation)
7. Write tests for `workoutValidation.ts`
8. Run tests (confirm RED)
9. Implement validation functions
10. Run tests (confirm GREEN)
11. Refactor if needed
12. Type check: `npm run type-check`

### **Phase 3: Hooks** (No tests)
13. Create `useWorkout.ts` hook
14. Create `useWorkoutActions.ts` hook
15. Create `useExerciseNames.ts` hook
16. Type check: `npm run type-check`

### **Phase 4: UI Components** (No tests)
17. Create `SetRow.tsx` component
18. Create `ExerciseCard.tsx` component
19. Create `BlockCard.tsx` component
20. Create `RestTimer.tsx` component
21. Type check: `npm run type-check`
22. Manual test each component in isolation

### **Phase 5: WorkoutDetailsScreen - View Mode**
23. Implement data fetching with `useWorkout`
24. Implement basic UI structure (header, workout info)
25. Integrate `BlockCard` and nested components
26. Implement set completion toggle
27. Implement "More Menu" actions (duplicate, delete)
28. Type check: `npm run type-check`
29. Manual testing (see checklist below)

### **Phase 6: WorkoutDetailsScreen - Edit Mode**
30. Add edit mode toggle
31. Implement inline editing (name, date, notes)
32. Implement "Add Block" functionality
33. Implement "Remove Block" functionality
34. Implement "Add Exercise" (open ExerciseSelector modal)
35. Implement "Remove Exercise" functionality
36. Implement Save/Cancel logic
37. Type check: `npm run type-check`
38. Manual testing (see checklist below)

### **Phase 7: Polish & Edge Cases**
39. Implement loading states (skeleton loaders)
40. Implement error states (retry buttons)
41. Implement empty states (helpful CTAs)
42. Add animations (set completion, FAB)
43. Test optimistic updates (disconnect backend, test rollback)
44. Type check: `npm run type-check`
45. Final manual testing (full checklist)

---

## File Structure Summary

### **New Files:**
```
frontend/src/
├── api/
│   ├── exercise.api.ts                        [NEW]
│   └── __tests__/
│       └── exercise.api.test.ts               [NEW]
├── components/
│   └── workout/
│       ├── SetRow.tsx                         [NEW]
│       ├── ExerciseCard.tsx                   [NEW]
│       ├── BlockCard.tsx                      [NEW]
│       └── RestTimer.tsx                      [NEW]
├── hooks/
│   ├── useWorkout.ts                          [NEW]
│   ├── useWorkoutActions.ts                   [NEW]
│   └── useExerciseNames.ts                    [NEW]
├── utils/
│   ├── workoutValidation.ts                   [NEW]
│   └── __tests__/
│       └── workoutValidation.test.ts          [NEW]
```

### **Updated Files:**
```
frontend/src/
├── api/
│   ├── workout.api.ts                         [UPDATE - Add new functions]
│   └── __tests__/
│       └── workout.api.test.ts                [UPDATE - Add new tests]
├── screens/
│   └── WorkoutDetailsScreen.tsx               [UPDATE - Full implementation]
├── types/
│   └── navigation.types.ts                    [VERIFY - Ensure params exist]
```

---

## Manual Testing Checklist (FE-3)

### **View Mode**
- [ ] Workout loads with all blocks, exercises, and sets
- [ ] Workout name, date, and notes display correctly
- [ ] Each block displays with correct label and rest period
- [ ] Each exercise displays with correct name and sets
- [ ] Set completion checkbox toggles correctly
- [ ] Completed sets show green background and strikethrough
- [ ] RPE badges display with correct colors
- [ ] Tapping set row opens SetEditor modal
- [ ] "More Menu" (•••) opens action sheet
- [ ] "Duplicate Workout" prompts for date, creates copy
- [ ] "Delete Workout" shows confirmation, deletes, navigates back
- [ ] "Edit Workout" switches to edit mode
- [ ] FAB "Start Workout" button calls startWorkout API (verify with backend logs)
- [ ] Loading state shows skeleton while fetching workout
- [ ] Error state shows message and retry button (test by disconnecting backend)
- [ ] Empty workout (no blocks) shows helpful empty state

### **Edit Mode**
- [ ] "Cancel" button exits edit mode without saving
- [ ] "Save" button saves changes and exits edit mode
- [ ] Workout name is editable inline (TextInput)
- [ ] Date picker allows date selection
- [ ] Notes TextInput allows multiline editing
- [ ] "Add Block" button creates new empty block
- [ ] "Remove Block" shows confirmation, removes block from UI
- [ ] Block label is editable inline (TextInput)
- [ ] Block rest period is editable inline (TextInput)
- [ ] "Add Exercise" button opens ExerciseSelector modal
- [ ] Selecting exercise in modal adds it to block
- [ ] "Remove Exercise" shows confirmation, removes exercise from UI
- [ ] Sets are view-only in edit mode (no completion toggle)
- [ ] "Save" with invalid data shows validation errors
- [ ] "Cancel" discards all changes made in edit mode
- [ ] Changes persist after save (verify by navigating away and back)

### **Optimistic Updates**
- [ ] Set completion updates UI immediately (no delay)
- [ ] If backend fails, set reverts to previous state with error toast
- [ ] Duplicate/delete actions show loading spinner during API call

### **Edge Cases**
- [ ] Workout with no blocks displays empty state
- [ ] Exercise with no sets displays "No sets defined"
- [ ] Missing exercise names fallback to "Unknown Exercise"
- [ ] Workout not found (invalid ID) shows error and back button
- [ ] Network error displays error banner with retry
- [ ] Offline mode shows cached workout with "Offline" badge

### **Navigation**
- [ ] Navigating from CalendarScreen with workoutId works
- [ ] Navigating from WorkoutListScreen with workoutId works
- [ ] Back button returns to previous screen
- [ ] After delete, navigates back to previous screen
- [ ] After duplicate, navigates to new workout details

---

## Success Criteria

1. ✅ View mode displays full workout structure (blocks, exercises, sets)
2. ✅ Set completion toggles work with optimistic updates
3. ✅ Edit mode allows inline editing of workout details
4. ✅ Add/remove blocks and exercises works in edit mode
5. ✅ Duplicate workout creates a copy with optional date
6. ✅ Delete workout removes workout and navigates back
7. ✅ Start workout button calls backend API (startTime set)
8. ✅ All modals integrate correctly (SetEditor, ExerciseSelector)
9. ✅ Loading, error, and empty states handled gracefully
10. ✅ All TypeScript types pass checks
11. ✅ API tests pass (TDD for API layer)
12. ✅ Validation tests pass (TDD for utils)
13. ✅ UI is responsive and accessible (touch targets, contrast)

---

## Dependencies

**No new dependencies required!** All necessary packages are already installed:
- React Navigation (navigation)
- TanStack Query (data fetching)
- React Native Reanimated (animations)
- Expo Haptics (vibration feedback)

---

## Notes

- **Follow TDD** for API layer and validation utilities (BP-3, TDD-1, TDD-2)
- **No component tests** for React Native components (FE-1)
- **State user interactions** for manual testing instead (FE-3)
- **Read backend routes** to ensure correct response structure (FE-3) ✓ (done)
- **Get user approval** for this plan before implementing (BP-2)
- **Type check frequently** during implementation (CQ-4)
- **Refactor along the way** and re-run tests after changes (CQ-3)

---

## Future Enhancements (Not in this phase)

- Drag-and-drop reordering for blocks and exercises
- Workout templates (save as template, create from template)
- Exercise substitution suggestions
- Rest timer with sound/vibration
- Active Workout Mode (dedicated screen for tracking during workout)
- Workout statistics (total volume, PR tracking)
- Exercise history (previous sets for same exercise)
- Superset/circuit indicators (visual grouping)

---

## API Request/Response Examples

### Get Workout (View Mode)
```
GET /api/workouts/:id
Response:
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "name": "Upper Body Strength",
    "date": "2025-11-02",
    "startTime": "2025-11-02T10:00:00Z",
    "lastModifiedTime": "2025-11-02T09:50:00Z",
    "notes": "Focus on progressive overload",
    "blocks": [
      {
        "id": "block-uuid-1",
        "label": "Warm Up",
        "exercises": [
          {
            "id": "exercise-instance-uuid-1",
            "exerciseId": "exercise-def-id-123",
            "orderInBlock": 0,
            "sets": [
              {
                "id": "set-uuid-1",
                "setNumber": 1,
                "targetRepsMin": 10,
                "targetRepsMax": 12,
                "actualReps": 12,
                "targetWeight": 135,
                "actualWeight": 135,
                "weightUnit": "lbs",
                "rpe": 7,
                "completed": true,
                "completedAt": "2025-11-02T10:15:00Z"
              }
            ],
            "restPeriod": "90 sec"
          }
        ],
        "restPeriod": "2 min"
      }
    ]
  }
}
```

### Update Workout (Edit Mode)
```
PUT /api/workouts/:id
Request Body:
{
  "name": "Upper Body Strength - Updated",
  "date": "2025-11-03",
  "notes": "Increased weight on bench press"
}
Response:
{
  "success": true,
  "data": { ...updated workout }
}
```

### Complete Set
```
POST /api/workouts/sets/:setId/complete
Request Body:
{
  "actualReps": 12,
  "actualWeight": 135,
  "rpe": 8,
  "notes": "Felt strong"
}
Response:
{
  "success": true,
  "data": { ...full updated workout }
}
```

### Add Block
```
POST /api/workouts/:workoutId/blocks
Request Body:
{
  "id": "new-block-uuid",
  "label": "Main Lift",
  "restPeriod": "3 min",
  "exercises": []
}
Response:
{
  "success": true,
  "data": { ...full updated workout }
}
```

---

**End of Plan**
