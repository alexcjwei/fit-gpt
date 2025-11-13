# Exercise Picker Feature - Codebase Exploration

## Start Here

This folder now contains comprehensive documentation about the codebase structure for implementing the exercise picker feature. Read this file first for orientation, then refer to the specific documents below.

## Document Index

### For Your Use Case (Exercise Picker)

**START HERE:** `EXPLORATION_SUMMARY.md`
- Quick overview of what was found
- Key findings summary
- FAQ section with quick answers
- Next steps

**THEN READ:** `EXERCISE_PICKER_QUICK_REF.md`
- Practical implementation guide
- Boilerplate code for exercise.api.ts
- Implementation patterns
- File paths
- Testing checklist

**DEEP DIVE:** `CODEBASE_OVERVIEW.md`
- Comprehensive reference
- All types and interfaces
- Backend services explained
- Frontend hooks explained
- Complete file structure

**ADVANCED:** `NAVIGATION_AND_DATA_FLOW.md`
- Navigation architecture
- Complete data flow diagrams
- User interaction flows
- Query cache management
- Error handling patterns

## What Was Explored

### Backend (Complete - 100% Ready)
- Exercise model and database schema
- Fuzzy search service with Fuse.js
- CRUD API routes with validation
- Exercise controller handlers
- Authentication middleware

### Frontend (Mostly Complete - 80% Ready)
- WorkoutDetailsScreen component
- BlockCard component (renders exercises)
- ExerciseCard component (renders in block)
- Navigation routing to ExerciseSelector
- Type definitions for Exercise/ExerciseInstance/SetInstance
- Hooks and mutations for adding exercises

### What Needs Implementation
- Frontend API layer for exercises (exercise.api.ts)
- ExerciseSelectorScreen with search
- Integration between UI and mutations

## Key Insights

### 1. Architecture is Solid
- Backend fully implemented with search, filters, pagination
- Frontend follows React Query patterns
- Navigation already wired up
- No blockers identified

### 2. Exercise Picker Flow
```
User in WorkoutDetailsScreen
→ Taps "+ Add Exercise" on BlockCard
→ Navigation to ExerciseSelectorScreen with blockId
→ User searches for exercise (fuzzy matching)
→ User selects exercise
→ Mutation calls addExercise(blockId, exercise)
→ Backend creates ExerciseInstance with SetInstance
→ Query invalidates and WorkoutDetailsScreen updates
→ User sees new exercise immediately
```

### 3. Critical Implementation Point
ExerciseSelectorScreen only receives `blockId` from navigation. You need to get `workoutId` either:
- From WorkoutDetailsScreen context, or
- Pass as additional route param, or
- Fetch from query cache

### 4. Fuzzy Search Already Works
The backend search endpoint uses Fuse.js with:
- Abbreviation expansion (db → dumbbell)
- Threshold matching (lenient by default)
- Multi-field search (name, category, muscles, equipment)

## File Structure

```
/Users/alexwei/code/gen-workout/
├── EXPLORATION_SUMMARY.md          ← START HERE
├── EXERCISE_PICKER_QUICK_REF.md    ← IMPLEMENTATION GUIDE
├── CODEBASE_OVERVIEW.md            ← COMPLETE REFERENCE
├── NAVIGATION_AND_DATA_FLOW.md     ← ADVANCED REFERENCE
├── frontend/src/
│   ├── screens/
│   │   ├── WorkoutDetailsScreen.tsx (has BlockCard)
│   │   └── modals/
│   │       └── ExerciseSelectorScreen.tsx (NEEDS UPDATE)
│   ├── api/
│   │   ├── client.ts (exists)
│   │   ├── workout.api.ts (exists)
│   │   └── exercise.api.ts (CREATE THIS)
│   ├── hooks/
│   │   └── useWorkoutDetailsMutations.ts (has addExercise)
│   └── types/
│       └── workout.types.ts (has Exercise, ExerciseInstance)
└── backend/src/ (all complete)
    ├── routes/exercise.routes.ts
    ├── controllers/exercise.controller.ts
    ├── services/
    │   ├── exercise.service.ts
    │   └── exerciseSearch.service.ts
    └── models/Exercise.ts
```

## Quick Implementation Checklist

- [ ] Read EXPLORATION_SUMMARY.md (15 min)
- [ ] Read EXERCISE_PICKER_QUICK_REF.md (20 min)
- [ ] Create exercise.api.ts from boilerplate (5 min)
- [ ] Update ExerciseSelectorScreen with search (30 min)
- [ ] Add loading states (10 min)
- [ ] Implement selection logic (15 min)
- [ ] Test end-to-end (20 min)

**Total estimated time: 1.5-2 hours**

## Key API Endpoints

```
GET /api/exercises/search?q=bench&limit=5
→ Fuzzy search results with scores

GET /api/exercises?category=chest&page=1&limit=20
→ Filtered list with pagination

POST /workouts/blocks/{blockId}/exercises
→ Add exercise to workout (already works)
```

## Type Relationships

```
Exercise (library definition)
├── id: MongoDB ObjectId (as string)
├── name, category, primaryMuscles, equipment
└── ... other metadata

ExerciseInstance (in workout)
├── id: UUID v4
├── exerciseId: reference to Exercise.id
├── orderInBlock: position in block (0-indexed)
└── sets: SetInstance[]

SetInstance (individual set)
├── id: UUID v4
├── setNumber: 1-indexed
├── targetReps, actualReps
├── targetWeight, actualWeight
└── weightUnit: 'lbs' | 'kg'
```

## React Query Strategy

```typescript
// For search results (cache by query)
['exercises', 'search', query]

// For filtered lists
['exercises', 'list', filters]

// Workout queries (invalidated on exercise add)
['workouts', workoutId]
['workouts', 'list']
['workouts', 'calendar']
```

## Common Patterns to Follow

1. **Navigation with Route Params**
   - See WorkoutDetailsScreen.handleOpenExerciseSelector

2. **Using Mutations**
   - See useWorkoutDetailsMutations.addExercise

3. **API Calls**
   - See workout.api.ts for structure

4. **Loading States**
   - See BlockCard "+ Add Exercise" button style

5. **Error Handling**
   - See WorkoutDetailsScreen Alert usage

## Questions?

Refer to the FAQ section in EXPLORATION_SUMMARY.md for quick answers to common questions about the codebase structure.

## Summary

Everything you need to implement the exercise picker is documented. The backend is 100% ready. The frontend is 80% ready. You have boilerplate code, type definitions, and clear patterns to follow.

You're ready to implement!

---

**Documentation Created:** November 3, 2025
**Total Documentation:** 1,415 lines across 4 files
**Status:** Complete and ready for implementation
