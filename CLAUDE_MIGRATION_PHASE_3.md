# Phase 3: Repository Layer

## Objectives
- Create repository pattern interfaces for data access
- Implement Postgres repositories using Kysely
- Write unit tests for repositories
- Keep Mongoose models as reference during transition

## Repository Pattern

We'll create a repository layer to abstract database operations. This provides:
- Clean separation between database logic and business logic
- Easier testing (can mock repositories)
- Type-safe database queries using Kysely
- Consistent error handling

## Repositories to Implement

### 1. UserRepository
**File:** `backend/src/repositories/UserRepository.ts`

**Methods:**
- `create(user)` - Create new user
- `findById(id)` - Find user by ID
- `findByEmail(email)` - Find user by email
- `update(id, updates)` - Update user
- `delete(id)` - Delete user
- `findByIdWithPassword(id)` - Get user including password field (for auth)

**Notes:**
- User model simplified (removed fitness_level, injuries, exercise_history, preferred_workout_days, workout_location, goals, availableEquipment)
- Password should be excluded by default except in specific auth methods

### 2. ExerciseRepository
**File:** `backend/src/repositories/ExerciseRepository.ts`

**Methods:**
- `create(exercise)` - Create exercise with tags
- `findById(id)` - Find exercise by ID with tags
- `findBySlug(slug)` - Find exercise by slug with tags
- `findAll(filters?)` - Get all exercises with optional filters (tags, name search, needsReview)
- `update(id, updates)` - Update exercise and tags
- `delete(id)` - Delete exercise (CASCADE deletes tags)
- `searchByName(query)` - Search exercises using pg_trgm similarity
- `findByTag(tag)` - Find exercises with specific tag
- `checkDuplicateName(name, excludeId?)` - Check for duplicate names

**Notes:**
- Tags are normalized in exercise_tags table
- Need to handle tag insertion/deletion when creating/updating exercises
- Use pg_trgm for fuzzy name search (replaces Fuse.js)

### 3. WorkoutRepository
**File:** `backend/src/repositories/WorkoutRepository.ts`

**Methods:**
- `create(workout)` - Create workout with nested blocks/exercises/sets
- `findById(id)` - Find workout by ID with all nested data
- `findByIdWithExerciseNames(id)` - Find workout with exercise names joined
- `findByUserId(userId, filters?)` - Get user's workouts with pagination/filtering
- `update(id, updates)` - Update workout basic fields
- `delete(id)` - Delete workout (CASCADE deletes nested data)
- `addBlock(workoutId, block)` - Add block to workout
- `updateBlock(blockId, updates)` - Update block
- `deleteBlock(blockId)` - Delete block
- `addExerciseToBlock(blockId, exercise)` - Add exercise to block
- `updateExerciseInstance(exerciseInstanceId, updates)` - Update exercise instance
- `deleteExerciseInstance(exerciseInstanceId)` - Delete exercise instance
- `addSet(exerciseInstanceId, set)` - Add set to exercise
- `updateSet(setId, updates)` - Update set
- `deleteSet(setId)` - Delete set
- `reorderBlocks(workoutId, blockIds)` - Reorder blocks
- `reorderExercises(blockId, exerciseIds)` - Reorder exercises in block
- `reorderSets(exerciseInstanceId, setIds)` - Reorder sets

**Notes:**
- Most complex repository due to deeply nested structure
- Need efficient JOINs to load full workout hierarchy
- Batch loading exercise names to avoid N+1 queries
- Use transactions for operations that modify multiple tables
- Handle ordering (order_in_workout, order_in_block, set_number)

## Implementation Strategy

### Step 1: Create Repository Interfaces
Define TypeScript interfaces for each repository to establish contracts.

### Step 2: Implement Repositories One at a Time
1. **UserRepository** (simplest, good starting point)
2. **ExerciseRepository** (moderate complexity, handles tags)
3. **WorkoutRepository** (most complex, nested structure)

### Step 3: Write Unit Tests
For each repository, write tests covering:
- CRUD operations
- Edge cases (not found, duplicates, etc.)
- Complex queries (filters, joins, search)
- Transactions (for multi-table operations)

### Step 4: Helper Functions
Create shared utilities:
- `toWorkoutType()` - Convert DB rows to Workout type
- `toExerciseType()` - Convert DB rows to Exercise type
- `toUserType()` - Convert DB rows to User type
- Error handling utilities

## Database Query Patterns

### Loading Nested Data (Workouts)
Use CTEs or multiple queries with JOINs:
```typescript
// Get workout with all nested data
const workout = await db
  .selectFrom('workouts as w')
  .leftJoin('workout_blocks as wb', 'wb.workout_id', 'w.id')
  .leftJoin('exercise_instances as ei', 'ei.workout_block_id', 'wb.id')
  .leftJoin('exercises as e', 'e.id', 'ei.exercise_id')
  .leftJoin('set_instances as si', 'si.exercise_instance_id', 'ei.id')
  .selectAll()
  .where('w.id', '=', workoutId)
  .execute();

// Then transform flat rows into nested structure
```

### Searching with pg_trgm
```typescript
const exercises = await db
  .selectFrom('exercises')
  .selectAll()
  .where(sql`name % ${query}`) // % is similarity operator
  .orderBy(sql`similarity(name, ${query})`, 'desc')
  .limit(10)
  .execute();
```

### Batch Loading (Avoid N+1)
```typescript
// Get all exercise IDs from workout
const exerciseIds = [...unique IDs from workout blocks];

// Single query to get all exercises
const exercises = await db
  .selectFrom('exercises')
  .selectAll()
  .where('id', 'in', exerciseIds)
  .execute();

// Create lookup map
const exerciseMap = new Map(exercises.map(e => [e.id, e]));
```

## Expected File Changes
- **New:** `backend/src/repositories/UserRepository.ts`
- **New:** `backend/src/repositories/ExerciseRepository.ts`
- **New:** `backend/src/repositories/WorkoutRepository.ts`
- **New:** `backend/src/repositories/index.ts`
- **New:** `backend/tests/unit/repositories/UserRepository.test.ts`
- **New:** `backend/tests/unit/repositories/ExerciseRepository.test.ts`
- **New:** `backend/tests/unit/repositories/WorkoutRepository.test.ts`

## Success Criteria
- [ ] All repository interfaces defined
- [ ] UserRepository implemented and tested
- [ ] ExerciseRepository implemented and tested
- [ ] WorkoutRepository implemented and tested
- [ ] Unit tests pass for all repositories
- [ ] Type check passes
- [ ] No direct Kysely queries in service layer (all go through repositories)

## Notes
- Keep repositories focused on data access only
- Business logic stays in service layer
- Use transactions for multi-table operations
- Handle errors consistently (throw custom errors)
- Return domain types (from src/types), not raw database rows
