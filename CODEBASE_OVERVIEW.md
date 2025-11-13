# Exercise Picker Feature - Codebase Structure Overview

## Project Structure

```
/Users/alexwei/code/gen-workout/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── models/            # MongoDB models
│   │   ├── routes/            # API route definitions
│   │   ├── controllers/       # Route handlers
│   │   ├── services/          # Business logic
│   │   └── types/             # TypeScript type definitions
│   └── tests/
├── frontend/                   # React Native Expo app
│   ├── src/
│   │   ├── screens/           # Screen components
│   │   ├── screens/modals/    # Modal/overlay screens
│   │   ├── api/               # API client layer
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript type definitions
│   │   └── constants/         # Configuration
│   └── node_modules/
└── CLAUDE.md                  # Project guidelines
```

## Key Components for Exercise Picker

### 1. Frontend Components

#### WorkoutDetailsScreen
- **Location**: `/Users/alexwei/code/gen-workout/frontend/src/screens/WorkoutDetailsScreen.tsx`
- **Purpose**: Main screen displaying a single workout with blocks and exercises
- **Key Features**:
  - Displays `WorkoutBlock` items in a list
  - Has "Edit" mode for managing blocks
  - Contains `BlockCard` component (defined in same file)
  - Calls `handleOpenExerciseSelector(blockId)` on "Add Exercise" button
  - Uses `useWorkoutDetailsMutations` hook for mutations

#### BlockCard Component (in WorkoutDetailsScreen)
- **Purpose**: Renders individual workout blocks with exercises
- **Props**:
  - `block: WorkoutBlock`
  - `blockNumber: number`
  - `isEditMode: boolean`
  - `onDelete: () => void`
  - `onAddExercise: () => void` - Triggers navigation to ExerciseSelector
  - `onSetPress: (setId: string) => void`
- **Key Elements**:
  - Block label and notes
  - List of exercises (via ExerciseCard)
  - "+ Add Exercise" button

#### ExerciseSelectorScreen
- **Location**: `/Users/alexwei/code/gen-workout/frontend/src/screens/modals/ExerciseSelectorScreen.tsx`
- **Purpose**: Screen for selecting an exercise to add to a block
- **Status**: MVP with hardcoded mock data
- **Current Implementation**:
  - Shows modal header with "Select Exercise" title
  - Has single "Barbell Bench Press" in MOCK_EXERCISES array
  - TODO comments indicate this needs to be replaced with API integration
  - `handleSelectExercise` currently shows an alert (not functional)
  - Navigation via React Navigation stack
- **Route Params**: `{ blockId: string }`

#### ExerciseDetailsScreen
- **Location**: `/Users/alexwei/code/gen-workout/frontend/src/screens/modals/ExerciseDetailsScreen.tsx`
- **Purpose**: Placeholder for detailed exercise view
- **Status**: Skeleton implementation only
- **Route Params**: `{ exerciseId: string }`

#### ExerciseBrowserScreen
- **Location**: `/Users/alexwei/code/gen-workout/frontend/src/screens/ExerciseBrowserScreen.tsx`
- **Purpose**: Exercise library browser (in Profile tab)
- **Status**: Empty placeholder

### 2. Type Definitions

#### Frontend Types
- **Location**: `/Users/alexwei/code/gen-workout/frontend/src/types/workout.types.ts`
- **Key Types**:
  - `Exercise`: Full exercise definition with all metadata
    - `id: string` (MongoDB ObjectId as string)
    - `name: string`
    - `category: ExerciseCategory`
    - `primaryMuscles: MuscleGroup[]`
    - `secondaryMuscles?: MuscleGroup[]`
    - `equipment: Equipment[]`
    - `difficulty?: DifficultyLevel`
    - `movementPattern?: MovementPattern`
    - `isUnilateral?: boolean`
    - `isCompound?: boolean`
    - `description?: string`
    - `setupInstructions?: string`
    - `formCues?: string[]`
    - `videoUrl?: string`
    - `alternativeExerciseIds?: string[]`
    - `tags?: string[]`
  - `ExerciseInstance`: Instance of an exercise in a workout block
    - `id: string` (UUID v4)
    - `exerciseId: string` (reference to Exercise)
    - `orderInBlock: number`
    - `sets: SetInstance[]`
    - `restPeriod?: string`
    - `notes?: string`
  - `SetInstance`: Individual set in an exercise
    - `id: string` (UUID v4)
    - `setNumber: number` (1-indexed)
    - `targetRepsMin/Max?: number`
    - `actualReps?: number`
    - `targetWeight?: number`
    - `actualWeight?: number`
    - `weightUnit: 'lbs' | 'kg'`
    - `targetDuration?: number`
    - `actualDuration?: number`
    - `rpe?: number`
    - `notes?: string`
  - Enums:
    - `MuscleGroup`: 18 muscle group types
    - `Equipment`: 15+ equipment types
    - `ExerciseCategory`: 10 categories
    - `DifficultyLevel`: beginner, intermediate, advanced, expert
    - `MovementPattern`: 10 movement pattern types

#### Navigation Types
- **Location**: `/Users/alexwei/code/gen-workout/frontend/src/types/navigation.types.ts`
- **Root Stack Routes** (modals):
  - `ExerciseSelector: { blockId: string }`
  - `ExerciseDetails: { exerciseId: string }`
  - `SetEditor: { setId: string }`
  - `WorkoutEditor: { ... }`
  - `Main: undefined` (bottom tab navigator)

### 3. API Layer

#### Frontend API Client
- **Location**: `/Users/alexwei/code/gen-workout/frontend/src/api/client.ts`
- **Type**: Axios instance with axios interceptors
- **Features**:
  - Automatic JWT token attachment from AsyncStorage
  - 401 error handling with unauthorized callback
  - Base URL from config
  - 10-second timeout

#### Workout API Functions
- **Location**: `/Users/alexwei/code/gen-workout/frontend/src/api/workout.api.ts`
- **Exercise-Related Functions**:
  - `addExercise(blockId, exercise)` - POST `/workouts/blocks/{blockId}/exercises`
  - `deleteExercise(exerciseId)` - DELETE `/workouts/exercises/{exerciseId}`
  - Both return updated `Workout` object
- **Block Functions**:
  - `addBlock(workoutId, block)` - POST `/workouts/{workoutId}/blocks`
  - `deleteBlock(blockId)` - DELETE `/workouts/blocks/{blockId}`

#### Exercise API Functions (NEED TO CREATE)
- Frontend has NO exercise API file yet
- Need to create `/Users/alexwei/code/gen-workout/frontend/src/api/exercise.api.ts`

### 4. Backend API Routes

#### Exercise Routes
- **Location**: `/Users/alexwei/code/gen-workout/backend/src/routes/exercise.routes.ts`
- **Endpoints**:
  - `GET /api/exercises/search?q=<query>&limit=<5-20>` - Fuzzy search by name
  - `GET /api/exercises` - List with filters & pagination
    - Query params: `category`, `muscleGroup`, `equipment`, `difficulty`, `search`, `page`, `limit`
  - `GET /api/exercises/:id` - Get single exercise by ID or slug
  - `POST /api/exercises` - Create exercise
  - `PUT /api/exercises/:id` - Update exercise
  - `DELETE /api/exercises/:id` - Delete exercise
- **All routes require authentication** via `authenticate` middleware
- **Validation**: Uses `express-validator` for all inputs

#### Search Endpoint Details
- **Path**: `/api/exercises/search`
- **Method**: GET
- **Query Parameters**:
  - `q` (required): Search query (2-100 characters)
  - `limit` (optional): Max 1-20 results (default: 5)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "results": [
        {
          "exercise": { ... Exercise object ... },
          "score": 0.1 (0=perfect match, 1=worst match)
        }
      ]
    }
  }
  ```

### 5. Backend Models

#### Exercise Model
- **Location**: `/Users/alexwei/code/gen-workout/backend/src/models/Exercise.ts`
- **Mongoose Schema**:
  - All fields from Exercise type
  - Indexes on: `name`, `category`, `primaryMuscles`
  - Slug field has unique constraint (sparse)
- **Interface**: `IExercise extends Document`

### 6. Backend Services

#### Exercise Service
- **Location**: `/Users/alexwei/code/gen-workout/backend/src/services/exercise.service.ts`
- **Functions**:
  - `listExercises(filters, pagination)` - Returns paginated results
  - `getExerciseById(idOrSlug)` - Find by MongoDB ID or slug
  - `createExercise(data)` - Create new exercise
  - `updateExercise(id, data)` - Update existing exercise
  - `deleteExercise(id)` - Delete exercise
- **Filter Interface**:
  ```typescript
  {
    category?: ExerciseCategory;
    muscleGroup?: MuscleGroup;
    equipment?: Equipment;
    difficulty?: DifficultyLevel;
    search?: string;
  }
  ```
- **Response Includes**: Pagination info with total, pages, current page, limit

#### Exercise Search Service
- **Location**: `/Users/alexwei/code/gen-workout/backend/src/services/exerciseSearch.service.ts`
- **Type**: Class-based with Fuse.js fuzzy search
- **Features**:
  - Fuzzy matching with abbreviation expansion (db→dumbbell, bb→barbell, etc.)
  - 5-minute cache TTL
  - Searches across: name (weight 0.5), category, muscles, equipment, tags
  - Configurable threshold (default 0.8 = very lenient)
- **Methods**:
  - `searchByName(query, options)` - Returns scored results
  - `findBestMatch(query, minScore)` - Returns single best result
  - `refreshCache()` - Force cache update
  - `getCachedExercises()` - Get all cached exercises

#### Exercise Controller
- **Location**: `/Users/alexwei/code/gen-workout/backend/src/controllers/exercise.controller.ts`
- **Functions**:
  - `searchExercises(req, res)` - Route handler for search endpoint
  - `getExercises(req, res)` - List exercises
  - `getExercise(req, res)` - Get single exercise
  - `createNewExercise(req, res)` - Create exercise
  - `updateExistingExercise(req, res)` - Update exercise
  - `deleteExistingExercise(req, res)` - Delete exercise

### 7. Hooks & Mutations

#### useWorkoutDetailsMutations
- **Location**: `/Users/alexwei/code/gen-workout/frontend/src/hooks/useWorkoutDetailsMutations.ts`
- **Purpose**: All workout detail mutations with optimistic updates
- **Mutations**:
  - `updateWorkout(updates)` - Update name, date, notes, startTime
  - `updateSet(setId, updates)` - Update set data (reps, weight, duration, RPE, notes)
  - `addBlock(block)` - Add new block to workout
  - `deleteBlock(blockId)` - Delete a block
  - `addExercise(blockId, exercise)` - Add exercise to block
  - `deleteExercise(exerciseId)` - Delete exercise from block
- **Features**:
  - Optimistic updates for most operations
  - Automatic query invalidation
  - Error rollback
  - Returns: mutation function, loading state, and error states
- **Add Exercise Signature**:
  ```typescript
  addExercise({
    blockId: string;
    exercise: {
      exerciseId: string;
      orderInBlock: number;
      sets?: Array<{
        setNumber: number;
        weightUnit: 'lbs' | 'kg';
        targetRepsMin?: number;
        targetRepsMax?: number;
        targetWeight?: number;
        targetDuration?: number;
      }>;
    };
  })
  ```

## Navigation Flow

```
WorkoutDetailsScreen
├── BlockCard (multiple)
│   ├── ExerciseCard (multiple)
│   └── "+ Add Exercise" button
│       └── navigation.navigate('ExerciseSelector', { blockId })
│           └── ExerciseSelectorScreen (modal/overlay)
│               ├── Search/List exercises
│               └── Select exercise
│                   └── useWorkoutDetailsMutations.addExercise()
│                       └── Adds ExerciseInstance to block
│                           └── WorkoutDetailsScreen updates (via query refetch)
│
└── SetEditor (modal)
    └── Edit SetInstance data
```

## Data Flow for Adding Exercise

1. **UI Trigger**: User taps "+ Add Exercise" in BlockCard
2. **Navigation**: Navigate to ExerciseSelector modal with blockId
3. **Selection**: User selects exercise in ExerciseSelectorScreen
4. **API Call**: `addExercise(blockId, { exerciseId, orderInBlock, sets })`
5. **Backend**:
   - Creates ExerciseInstance with generated UUID
   - Creates SetInstance objects if provided
   - Returns updated Workout
6. **Frontend**:
   - Query cache updates automatically (via mutation onSuccess)
   - WorkoutDetailsScreen re-renders with new exercise
7. **Display**: ExerciseCard shows new exercise in block

## Current State & TODOs

### Implemented:
- Backend exercise CRUD fully functional
- Backend exercise search with fuzzy matching
- Frontend navigation to ExerciseSelector
- WorkoutDetailsScreen structure
- BlockCard and ExerciseCard components
- Type definitions for Exercise, ExerciseInstance, SetInstance
- API mutation infrastructure (useWorkoutDetailsMutations)

### TODO for Exercise Picker Feature:
- Create `/frontend/src/api/exercise.api.ts` with search/list functions
- Replace MOCK_EXERCISES in ExerciseSelectorScreen with real API calls
- Implement exercise search UI with search bar/text input
- Add loading states to ExerciseSelectorScreen
- Handle exercise selection logic (create default sets?)
- Implement ExerciseDetailsScreen with full exercise info
- Add pagination/infinite scroll for large exercise lists
- Test integration end-to-end
- Update Swagger docs if adding new API routes

## Key Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `frontend/src/screens/WorkoutDetailsScreen.tsx` | Main workout view | Ready |
| `frontend/src/screens/modals/ExerciseSelectorScreen.tsx` | Exercise picker | MVP (needs API) |
| `frontend/src/types/workout.types.ts` | Type definitions | Complete |
| `frontend/src/api/workout.api.ts` | Workout API functions | Complete |
| `frontend/src/api/exercise.api.ts` | Exercise API functions | MISSING - NEEDS CREATE |
| `frontend/src/hooks/useWorkoutDetailsMutations.ts` | Mutations | Complete |
| `frontend/src/types/navigation.types.ts` | Navigation types | Complete |
| `backend/src/models/Exercise.ts` | Mongoose model | Complete |
| `backend/src/routes/exercise.routes.ts` | Route definitions | Complete |
| `backend/src/services/exercise.service.ts` | Exercise CRUD | Complete |
| `backend/src/services/exerciseSearch.service.ts` | Fuzzy search | Complete |
| `backend/src/controllers/exercise.controller.ts` | Route handlers | Complete |

## Query & Mutation Keys (React Query)

- **Workout queries**:
  - `['workouts', workoutId]` - Single workout
  - `['workouts', 'list']` - Workout list
  - `['workouts', 'calendar']` - Calendar view

- **Exercise queries** (to be created):
  - `['exercises', { search, limit }]` - Search results
  - `['exercises', { category, muscleGroup, ... }]` - Filtered list

## Important Notes

1. **BlockCard is NOT a separate file** - it's defined in WorkoutDetailsScreen
2. **ExerciseInstance is different from Exercise** - Instance is workout-specific, Exercise is the library definition
3. **SetInstance is always created with ExerciseInstance** - Exercise instances always have sets array
4. **Search endpoint uses fuzzy matching**, not exact name matching
5. **All backend routes require authentication** - Token is auto-attached by axios interceptor
6. **Optimistic updates** are used in mutations for better UX
7. **orderInBlock** is 0-indexed for ExerciseInstance positioning
8. **setNumber** in SetInstance is 1-indexed for display
