# Navigation & Data Flow Architecture

## Navigation Stack Overview

### Root Navigation Structure
```
RootStackNavigator (Modals/Overlays)
├── Main (BottomTabNavigator)
│   ├── Calendar Stack
│   │   ├── CalendarScreen
│   │   └── WorkoutDetailsScreen
│   ├── Workouts Stack
│   │   ├── WorkoutListScreen
│   │   └── WorkoutDetailsScreen
│   ├── AI Stack (placeholder)
│   └── Profile Stack
│       ├── ProfileScreen
│       ├── ExerciseBrowserScreen
│       └── SettingsScreen
│
├── WorkoutEditor Modal
│   └── Workout creation/editing
│
├── ExerciseSelector Modal
│   └── Exercise picker (THIS IS WHAT WE'RE IMPLEMENTING)
│
├── ExerciseDetails Modal
│   └── Detailed exercise view
│
└── SetEditor Modal
    └── Set data editing
```

## Current Navigation Routes

From `frontend/src/types/navigation.types.ts`:

```typescript
type RootStackParamList = {
  Main: undefined;  // Points to bottom tab navigator
  
  // Modals
  WorkoutEditor: {
    workoutId?: string;
    mode: 'create' | 'edit';
    date?: string;
    duplicateFromId?: string;
  };
  
  ExerciseSelector: { 
    blockId: string  // Which block to add exercise to
  };
  
  ExerciseDetails: { 
    exerciseId: string  // Which exercise to view
  };
  
  SetEditor: { 
    setId: string  // Which set to edit
  };
};
```

## Workout Details Screen Navigation Flow

```
WorkoutDetailsScreen
│
├─ (Displays) → BlockCard (mapped from workout.blocks)
│  │
│  ├─ (Displays) → ExerciseCard (mapped from block.exercises)
│  │  │
│  │  └─ User Action: Tap Set
│  │     └─ Call: handleOpenSetEditor(setId)
│  │        └─ Navigate: navigation.navigate('SetEditor', { setId })
│  │           └─ SetEditor Modal
│  │
│  └─ User Action: Tap "+ Add Exercise"
│     └─ Call: handleOpenExerciseSelector(blockId)
│        └─ Navigate: navigation.navigate('ExerciseSelector', { blockId })
│           └─ ExerciseSelector Modal (THIS IS WHERE EXERCISE IS SELECTED)
│
└─ User Action: Delete Block
   └─ Call: handleDeleteBlock(blockId)
      └─ Mutation: deleteBlock(blockId)
         └─ Backend: DELETE /workouts/blocks/{blockId}
            └─ Frontend: Query refetch updates WorkoutDetailsScreen

LEGEND:
- (Displays) = Component renders child component
- User Action = User interaction with UI
- Call = Function call
- Navigate = Navigation call
- Mutation = React Query mutation
- Backend = API call to backend
```

## ExerciseSelector Modal Data Flow

```
INIT:
  └─ Route receives { blockId }
     └─ ExerciseSelectorScreen mounted

UI:
  ├─ Header: "Select Exercise" title + "Cancel" button
  ├─ Search Input: Text input for query
  └─ Exercise List: FlatList of search results

USER INTERACTION #1: Enter Search Query
  └─ TextInput onChange → setSearchQuery(text)
     └─ useQuery triggered (if query.length > 2)
        └─ API Call: GET /api/exercises/search?q={query}&limit=5
           └─ Backend: ExerciseSearchService.searchByName()
              └─ Fuse.js fuzzy matching + abbreviation expansion
                 └─ Returns: { results: [{ exercise, score }] }
                    └─ React Query caches result
                       └─ Component re-renders with results

USER INTERACTION #2: Tap Exercise Item
  └─ onPress(exerciseId)
     └─ Call: handleSelectExercise(exerciseId)
        └─ Create ExerciseInstance object:
           {
             exerciseId: string,
             orderInBlock: number,
             sets: [{ setNumber, weightUnit }, ...]
           }
        └─ Call: addExercise(blockId, exercise)
           └─ Mutation: POST /workouts/blocks/{blockId}/exercises
              └─ Backend:
                 ├─ Create ExerciseInstance (UUID)
                 ├─ Create default SetInstance objects
                 └─ Return: Updated Workout
              └─ Frontend:
                 ├─ Mutation onSuccess callback
                 ├─ Update React Query cache ['workouts', workoutId]
                 ├─ Trigger query invalidation
                 └─ WorkoutDetailsScreen re-renders with new exercise
                    └─ BlockCard displays new ExerciseCard
                       └─ User can see the exercise immediately

USER INTERACTION #3: Tap "Cancel"
  └─ onPress()
     └─ navigation.goBack()
        └─ ExerciseSelector Modal closes
           └─ Return to WorkoutDetailsScreen
```

## Key Navigation Patterns

### Pattern 1: Navigate from Screen to Modal
```typescript
// In WorkoutDetailsScreen
const navigation = useNavigation<RootNavigationProp>();

const handleOpenExerciseSelector = (blockId: string) => {
  navigation.navigate('ExerciseSelector', { blockId });
};

// In ExerciseSelectorScreen
const navigation = useNavigation<ExerciseSelectorNavigationProp>();

const handleCancel = () => {
  navigation.goBack();
};
```

### Pattern 2: Get Route Parameters
```typescript
// In ExerciseSelectorScreen
const route = useRoute<ExerciseSelectorRouteProp>();
const { blockId } = route.params;

// Then use blockId in API calls or mutations
```

### Pattern 3: Navigate with Data (Return Flow)
```typescript
// Option A: Via mutation + automatic cache update
// When exercise is added, WorkoutDetailsScreen updates automatically
// because query cache is invalidated

// Option B: Via navigation params (if needed)
navigation.navigate('ScreenName', { data: value });
// Retrieve in destination:
const { data } = route.params;
```

## Data Relationship Diagram

```
Exercise (MongoDB Document)
├── _id: ObjectId (converted to string 'id')
├── name: "Barbell Bench Press"
├── category: "chest"
├── primaryMuscles: ["chest"]
├── secondaryMuscles: ["triceps", "shoulders"]
├── equipment: ["barbell", "bench"]
├── difficulty: "intermediate"
├── movementPattern: "push"
├── isCompound: true
├── formCues: ["Retract scapula", ...]
└── videoUrl: "https://..."

         ↓ (User selects in ExerciseSelector)
         
ExerciseInstance (in Workout.blocks[].exercises[])
├── id: "550e8400-e29b-41d4-a716-446655440000" (UUID v4)
├── exerciseId: "ObjectId string" (reference to Exercise._id)
├── orderInBlock: 0 (0-indexed position in block)
├── sets: SetInstance[] (created when exercise is added)
├── restPeriod: "60 sec"
└── notes: "Use full range of motion"

         ↓ (Contains multiple sets)
         
SetInstance (in ExerciseInstance.sets[])
├── id: "550e8400-e29b-41d4-a716-446655440001" (UUID v4)
├── setNumber: 1 (1-indexed for display)
├── targetRepsMin: 6
├── targetRepsMax: 8
├── actualReps: undefined (filled in during workout)
├── targetWeight: 225
├── actualWeight: undefined (filled in during workout)
├── weightUnit: "lbs"
├── targetDuration: undefined
├── actualDuration: undefined (for time-based exercises)
├── rpe: undefined (filled in during workout)
└── notes: undefined
```

## Data Flow for Complete Exercise Addition Workflow

```
1. USER SEES WORKOUT
   ├─ App loads WorkoutDetailsScreen
   ├─ useQuery fetches Workout from /api/workouts/{workoutId}
   └─ WorkoutDetailsScreen renders with blocks and exercises

2. USER TAPS "+ ADD EXERCISE"
   ├─ WorkoutDetailsScreen.handleOpenExerciseSelector(blockId)
   └─ Navigation: navigate('ExerciseSelector', { blockId })

3. EXERCISE SELECTOR OPENS
   ├─ ExerciseSelectorScreen receives blockId param
   ├─ User types search query
   └─ useQuery with queryKey=['exercises','search',query]

4. SEARCH RESULTS LOAD
   ├─ API: GET /api/exercises/search?q={query}&limit=5
   ├─ Backend: ExerciseSearchService fuzzy search
   ├─ Response: { success, data: { results: [{exercise, score}] } }
   └─ ExerciseSelectorScreen displays results list

5. USER SELECTS EXERCISE
   ├─ handleSelectExercise(exerciseId)
   ├─ Create ExerciseInstance object:
   │  {
   │    exerciseId: selectedExerciseId,
   │    orderInBlock: block.exercises.length,
   │    sets: [
   │      { setNumber: 1, weightUnit: 'lbs' },
   │      { setNumber: 2, weightUnit: 'lbs' },
   │      { setNumber: 3, weightUnit: 'lbs' }
   │    ]
   │  }
   └─ addExercise({ blockId, exercise })

6. MUTATION EXECUTES
   ├─ useWorkoutDetailsMutations.addExercise
   ├─ onMutate: (optional) optimistic update
   ├─ API: POST /workouts/blocks/{blockId}/exercises
   │  Body: { exerciseId, orderInBlock, sets }
   └─ Backend processes request

7. BACKEND PROCESSING
   ├─ Route: POST /workouts/blocks/{blockId}/exercises
   ├─ Controller: addExercise handler
   ├─ Service: Add ExerciseInstance to block
   │  ├─ Generate new UUID for exercise instance
   │  ├─ Generate UUIDs for each set
   │  └─ Save to database
   ├─ Response: Updated Workout object
   └─ Status: 200 OK

8. MUTATION SUCCESS
   ├─ onSuccess callback executes
   ├─ Update cache: setQueryData(['workouts', workoutId], data)
   ├─ Invalidate queries: 
   │  ├─ ['workouts', workoutId]
   │  ├─ ['workouts', 'list']
   │  └─ ['workouts', 'calendar']
   └─ React Query refetch triggered

9. UI UPDATES
   ├─ WorkoutDetailsScreen re-renders with updated query data
   ├─ BlockCard re-renders with new ExerciseInstance
   ├─ ExerciseCard renders for the newly added exercise
   │  ├─ Shows exercise name (fetched from library if needed)
   │  ├─ Shows "0 / 3 sets completed"
   │  └─ Lists 3 SetInstance items
   └─ User can now edit sets or add more exercises

10. NAVIGATION BACK
    ├─ ExerciseSelectorScreen.navigation.goBack()
    ├─ Modal closes
    └─ User sees updated WorkoutDetailsScreen with new exercise
```

## Query Cache Management

### Queries Affected by addExercise Mutation

```typescript
// These queries are invalidated after successful addExercise:
queryClient.invalidateQueries({ queryKey: ['workouts', workoutId] });
queryClient.invalidateQueries({ queryKey: ['workouts', 'list'] });
queryClient.invalidateQueries({ queryKey: ['workouts', 'calendar'] });

// These queries are independent (no invalidation needed):
- ['exercises', 'search', query]  // Exercise library search
- ['exercises', 'list', filters]  // Exercise library list
- Sets are fetched as part of Workout, not separately
```

### Query Keys Used in Exercise Picker

```typescript
// Exercise Library Queries (to be created)
['exercises', 'search', query]  // Fuzzy search results
['exercises', 'list', filters]  // Filtered/paginated list
['exercises', 'single', id]     // Single exercise details

// Workout Queries (existing)
['workouts', workoutId]         // Current workout being edited
['workouts', 'list']            // Workout list
['workouts', 'calendar']        // Calendar view
```

## Error Handling Flow

```
User Action
  └─ Mutation Call (addExercise)
     └─ API Request
        ├─ SUCCESS (200)
        │  └─ onSuccess callback
        │     └─ Cache update & invalidation
        │        └─ UI updates
        │           └─ User sees new exercise
        │
        ├─ NETWORK ERROR
        │  └─ onError callback
        │     └─ Rollback optimistic update
        │        └─ Show error alert
        │           └─ User taps retry or Cancel
        │
        ├─ CLIENT ERROR (400)
        │  └─ Validation failed (invalid blockId, etc.)
        │     └─ Show specific error message
        │
        ├─ SERVER ERROR (500)
        │  └─ Generic server error
        │     └─ Show "Try again" message
        │
        └─ AUTH ERROR (401)
           └─ Token expired
              └─ Logout & redirect to login
                 └─ User re-authenticates
```

## Component Lifecycle for Exercise Addition

```
BEFORE:
WorkoutDetailsScreen
├── Workout loaded
├── Block 1: Exercises [A, B]
├── Block 2: Exercises [C]
└── User taps "+ Add Exercise" on Block 1

TRANSITION:
ExerciseSelectorScreen MOUNTS
├── Receives blockId (Block 1)
├── User searches and selects Exercise D
└─ Mutation fires

AFTER:
WorkoutDetailsScreen
├── Workout refetched/updated
├── Block 1: Exercises [A, B, D]  ← D is new
├── Block 2: Exercises [C]
└── All displayed immediately (optimistic update if implemented)
```

## Important Navigation Notes

1. **RootStackParamList is for modals only** - Not for main tab navigation
2. **BlockCard is NOT a screen** - It's a component rendered in WorkoutDetailsScreen
3. **Navigation must include blockId** - Needed to know which block to add exercise to
4. **ExerciseSelector returns via goBack()** - Not via navigation.navigate() with params
5. **Data persists via React Query** - Not via navigation parameters
6. **Modal can be cancelled** - User can go back without selecting exercise

