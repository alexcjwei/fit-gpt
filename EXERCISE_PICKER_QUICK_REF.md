# Exercise Picker Implementation - Quick Reference

## Component Location Map

```
FRONTEND COMPONENTS:
├── /frontend/src/screens/WorkoutDetailsScreen.tsx
│   ├── Exports: WorkoutDetailsScreen, BlockCard, ExerciseCard
│   └── Use: Main workout view
│
├── /frontend/src/screens/modals/ExerciseSelectorScreen.tsx
│   ├── Status: MVP with MOCK_EXERCISES
│   ├── Route: 'ExerciseSelector' with blockId param
│   └── TODO: Integrate real API
│
└── /frontend/src/screens/modals/ExerciseDetailsScreen.tsx
    ├── Status: Skeleton only
    └── Route: 'ExerciseDetails' with exerciseId param

BACKEND COMPONENTS:
├── /backend/src/models/Exercise.ts
│   └── Mongoose model with indexes on name, category, primaryMuscles
│
├── /backend/src/routes/exercise.routes.ts
│   ├── GET /api/exercises/search?q=<query>
│   ├── GET /api/exercises (with filters)
│   ├── GET/POST/PUT/DELETE /api/exercises/:id
│   └── All require authentication
│
├── /backend/src/services/exercise.service.ts
│   └── CRUD operations with pagination
│
├── /backend/src/services/exerciseSearch.service.ts
│   ├── Fuzzy search with Fuse.js
│   ├── 5-minute cache
│   └── Abbreviation expansion
│
└── /backend/src/controllers/exercise.controller.ts
    └── Route handlers for all endpoints

TYPE DEFINITIONS:
├── /frontend/src/types/workout.types.ts
│   ├── Exercise, ExerciseInstance, SetInstance
│   ├── MuscleGroup, Equipment, ExerciseCategory
│   └── DifficultyLevel, MovementPattern
│
└── /frontend/src/types/navigation.types.ts
    └── RootStackParamList with route types
```

## API Integration Checklist

### Frontend API (NEEDS TO BE CREATED)

Create: `/frontend/src/api/exercise.api.ts`

```typescript
import apiClient from './client';
import type { Exercise } from '../types/workout.types';

// Search exercises by name (fuzzy matching)
export const searchExercises = async (
  query: string,
  limit?: number
): Promise<{ exercise: Exercise; score: number }[]> => {
  const response = await apiClient.get('/exercises/search', {
    params: { q: query, limit: limit || 5 },
  });
  return response.data.data.results;
};

// List exercises with filters
export const listExercises = async (params?: {
  category?: string;
  muscleGroup?: string;
  equipment?: string;
  difficulty?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ exercises: Exercise[]; pagination: any }> => {
  const response = await apiClient.get('/exercises', { params });
  return response.data.data;
};

// Get single exercise by ID or slug
export const getExercise = async (idOrSlug: string): Promise<Exercise> => {
  const response = await apiClient.get(`/exercises/${idOrSlug}`);
  return response.data.data;
};
```

### Backend API Routes (ALREADY COMPLETE)

Key endpoints for exercise picker:

```
GET /api/exercises/search?q=bench&limit=5
├── Auth: Required
├── Response: { success, data: { results: [{ exercise, score }] } }
└── Use: Real-time search in ExerciseSelectorScreen

GET /api/exercises?category=chest&muscleGroup=chest&page=1&limit=20
├── Auth: Required
├── Response: { success, data: { exercises: [], pagination: {} } }
└── Use: Browse/filter exercises

GET /api/exercises/{id}
├── Auth: Required
├── Response: { success, data: Exercise }
└── Use: Load exercise details for ExerciseDetailsScreen
```

## ExerciseSelectorScreen Enhancement Steps

### Current State
- Hardcoded MOCK_EXERCISES array
- `handleSelectExercise` shows alert instead of adding exercise

### What to Add

1. **Search State**:
   ```typescript
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedExercises, setSelectedExercises] = useState([]);
   ```

2. **API Integration**:
   ```typescript
   const { data: searchResults, isLoading } = useQuery({
     queryKey: ['exercises', 'search', searchQuery],
     queryFn: () => searchExercises(searchQuery),
     enabled: searchQuery.length > 2,
   });
   ```

3. **Exercise Selection Logic**:
   ```typescript
   const handleSelectExercise = async (exerciseId: string) => {
     const { addExercise } = useWorkoutDetailsMutations(workoutId);
     
     // Create exercise instance with default 3 sets
     const newExercise = {
       exerciseId,
       orderInBlock: block.exercises.length,
       sets: [1, 2, 3].map(num => ({
         setNumber: num,
         weightUnit: 'lbs',
       })),
     };
     
     await addExercise({ blockId, exercise: newExercise });
     navigation.goBack();
   };
   ```

## Type Flow

```
Exercise (library definition)
  ├── id: MongoDB ObjectId string
  ├── name: string
  ├── category: ExerciseCategory
  ├── primaryMuscles: MuscleGroup[]
  └── ... other metadata

ExerciseInstance (in workout)
  ├── id: UUID v4
  ├── exerciseId: string (ref to Exercise.id)
  ├── orderInBlock: number (0-indexed)
  ├── sets: SetInstance[]
  └── restPeriod?: string

SetInstance (individual set)
  ├── id: UUID v4
  ├── setNumber: number (1-indexed)
  ├── targetReps/Weight?: number
  ├── actual Reps/Weight?: number
  └── weightUnit: 'lbs' | 'kg'
```

## Mutation Integration

```typescript
// In ExerciseSelectorScreen
const route = useRoute<ExerciseSelectorRouteProp>();
const { blockId } = route.params;

// Get blockId from route to find workout
const workoutId = /* extract from params or query */;

const { addExercise, isAddingExercise } = 
  useWorkoutDetailsMutations(workoutId);

const handleSelectExercise = async (exerciseId: string) => {
  try {
    await addExercise({
      blockId,
      exercise: {
        exerciseId,
        orderInBlock: block.exercises.length,
        sets: [/* default sets */],
      },
    });
    navigation.goBack();
  } catch (error) {
    Alert.alert('Error', 'Failed to add exercise');
  }
};
```

## Search Implementation Patterns

### Option 1: Debounced Real-time Search
```typescript
const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebounce(searchQuery, 300);

const { data: results } = useQuery({
  queryKey: ['exercises', 'search', debouncedQuery],
  queryFn: () => searchExercises(debouncedQuery),
  enabled: debouncedQuery.length > 2,
});
```

### Option 2: Search on Submit
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState([]);

const handleSearch = async () => {
  const results = await searchExercises(searchQuery);
  setSearchResults(results);
};
```

## Default Set Creation Strategy

When adding an exercise, decide how many default sets to create:

```typescript
// Option A: User-specified count
const setCount = 3; // or get from user input
const sets = Array.from({ length: setCount }, (_, i) => ({
  setNumber: i + 1,
  weightUnit: 'lbs',
}));

// Option B: From exercise category
// Some categories always have certain set counts

// Option C: No default sets, let user create them
const sets = undefined; // Backend creates minimal set

// Option D: From exercise difficulty
const setCountByDifficulty = {
  'beginner': 3,
  'intermediate': 4,
  'advanced': 5,
};
```

## Error Handling

```typescript
try {
  await addExercise({ blockId, exercise });
  navigation.goBack();
} catch (error) {
  if (error.response?.status === 400) {
    Alert.alert('Invalid Exercise', error.response.data.message);
  } else if (error.response?.status === 404) {
    Alert.alert('Not Found', 'Exercise no longer exists');
  } else {
    Alert.alert('Error', 'Failed to add exercise');
  }
}
```

## Testing Checklist

- [ ] Search returns results with score (0 = perfect, 1 = worst)
- [ ] Fuzzy matching works (e.g., "bench" matches "Barbell Bench Press")
- [ ] Abbreviations expand (e.g., "db press" works)
- [ ] Selected exercise appears in ExerciseCard immediately
- [ ] Multiple exercises can be added to same block
- [ ] Exercise removal still works (deleteExercise)
- [ ] Navigation back from ExerciseSelectorScreen
- [ ] Loading state shown while adding
- [ ] Error states handled gracefully

## Existing Working Patterns to Follow

1. **Query Invalidation**: See useWorkoutDetailsMutations for pattern
2. **Error Handling**: Check WorkoutDetailsScreen for Alert usage
3. **Loading States**: Check addButton disabled state logic
4. **Navigation**: Check handleOpenExerciseSelector pattern
5. **API Calls**: Check workout.api.ts for structure

## Performance Considerations

1. **Search Debouncing**: Needed to avoid excessive API calls
2. **Cache Invalidation**: Handled automatically by mutation onSuccess
3. **Pagination**: Backend supports page/limit params
4. **List Virtualization**: Use FlatList with proper keys (already in ExerciseSelectorScreen)
5. **Search Results Caching**: React Query handles by queryKey

## File Paths (Absolute)

```
/Users/alexwei/code/gen-workout/frontend/src/screens/WorkoutDetailsScreen.tsx
/Users/alexwei/code/gen-workout/frontend/src/screens/modals/ExerciseSelectorScreen.tsx
/Users/alexwei/code/gen-workout/frontend/src/api/workout.api.ts
/Users/alexwei/code/gen-workout/frontend/src/api/exercise.api.ts (TO CREATE)
/Users/alexwei/code/gen-workout/frontend/src/hooks/useWorkoutDetailsMutations.ts
/Users/alexwei/code/gen-workout/frontend/src/types/workout.types.ts
/Users/alexwei/code/gen-workout/backend/src/routes/exercise.routes.ts
/Users/alexwei/code/gen-workout/backend/src/controllers/exercise.controller.ts
/Users/alexwei/code/gen-workout/backend/src/services/exercise.service.ts
/Users/alexwei/code/gen-workout/backend/src/services/exerciseSearch.service.ts
```
