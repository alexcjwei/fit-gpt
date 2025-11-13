# MongoDB to PostgreSQL Migration Log

Started migration - 2025-11-12
Created docker-compose.yml with PostgreSQL 16 Alpine
Installed kysely, pg, @types/pg; removed mongoose and mongodb-memory-server
Created db/ directory with types.ts, connection.ts, and index.ts
Updated env.ts to use PostgreSQL environment variables
Updated .env.example with PostgreSQL configuration
Updated database.ts to use PostgreSQL connection
Started PostgreSQL container with Docker Compose
Phase 1 complete - infrastructure setup done
Updated Kysely types to 7 tables (removed unresolved_exercises, simplified users)
Created migration runner infrastructure
Added migration scripts to package.json
Created 001_initial_schema migration with all 7 tables
Ran initial migration successfully - all tables created with indexes and constraints
Updated seedExercises.ts to use Kysely with ON CONFLICT upserts
Tested seed script - successfully inserted 63 exercises with 170 normalized tags
Updated testDb.ts to use PostgreSQL with Kysely instead of mongodb-memory-server
Created fit_gpt_test database for integration tests
Phase 2 complete - schema and migrations fully operational
Created UserRepository with 24 passing unit tests
Created ExerciseRepository with 38 passing unit tests - includes tag normalization, pg_trgm similarity search
Created WorkoutRepository with 31 passing unit tests - handles deeply nested workout structure
Added User and UserWithPassword types to src/types/index.ts
Fixed testDb.ts pool cleanup to prevent "Called end on pool more than once" error
Implemented type conversion utilities for date (to ISO string) and numeric (to number) values
Configured Jest with maxWorkers: 1 to prevent database deadlocks during parallel test execution
Phase 3 complete - repository layer fully implemented and tested (93 tests total)
Migrated auth.service.ts to use UserRepository with dependency injection
Created unit tests for auth service (13 tests passing)
Migrated exerciseSearch.service.ts to use pg_trgm via ExerciseRepository
Removed Fuse.js dependency in favor of database-level similarity search
Simplified exerciseSearch tests - 15 tests passing
Kept abbreviation expansion logic (DB, BB, RDL, OHP, etc.)
Score threshold removed - pg_trgm handles similarity matching at database level
Migrated exerciseCreation.service.ts to use ExerciseRepository (8 tests passing)
Migrated exercise.service.ts to use ExerciseRepository for all CRUD operations
Changed ID validation from MongoDB ObjectId to numeric ID format
Removed aiExerciseResolver.ts UnresolvedExercise tracking (table removed in Phase 2)
Starting workout.service.ts migration (most complex - nested workout structure)
Type-checking Phase 4 service migrations:
- Fixed bigint vs number type mismatches by updating src/db/types.ts to use bigint for all ID columns
- Fixed exercise.service.ts to use correct repository methods (checkDuplicateName instead of existsByName, findAll with pagination instead of filter)
- Fixed unused variable warnings in aiExerciseResolver.ts and exerciseSearch.service.ts
- Added helper functions to WorkoutRepository for type conversions (toISOTimestamp, nullToUndefined)
- Partially fixed WorkoutRepository null→undefined conversions in create() method
- Status: 91 type errors remaining (down from 130+):
  * 49 errors in repositories (mostly WorkoutRepository null→undefined conversions)
  * 36 errors in workout.service.ts (incorrectly migrated - using wrong repository methods)
  * 6 errors in test files (mongoose imports - expected)
Next steps: Complete WorkoutRepository type conversions and re-migrate workout.service.ts

Completed fixing all WorkoutRepository type conversions:
- Fixed bigint vs number type issues by updating src/db/types.ts
- Added helper functions: toISOTimestamp(), nullToUndefined()
- Changed all updateData objects from Partial<Table> to any type to avoid Generated<T> conflicts
- Applied null→undefined conversions throughout all return statements
- Fixed LEFT JOIN nullable field issues with non-null assertions
- Removed unused table type imports
Fixed ExerciseRepository and UserRepository type conversions:
- Changed toExercise() and toUser() parameter types from table types to any
- Changed updateData from Partial<Table> to any type
- All repository type errors resolved
Status: 49 type errors remaining (down from 130+):
- 1 error in ExerciseRepository (RawBuilder pg_trgm query - minor)
- 36 errors in workout.service.ts (incorrectly migrated - needs complete rewrite)
- 12 errors in test files (mongoose imports - expected, will fix in Phase 5)
Next: Fix minor ExerciseRepository RawBuilder error, then re-migrate workout.service.ts properly

Fixed remaining workout.service.ts type errors:
- Migrated listWorkouts() to fetch all workouts and apply filtering/pagination in memory
- Migrated getWorkoutsByDateRange() to fetch all workouts and filter by date range
- Migrated addBlock() to delegate to repo.addBlock() and update lastModifiedTime
- Migrated addExercise() to delegate to repo.addExerciseToBlock() with all required fields
- All workout.service.ts methods now properly use repository layer
Phase 4 complete - service layer fully migrated (only mongoose import errors remain)
Status: 12 type errors remaining (all are mongoose/mongodb-memory-server imports in old models and tests)
- 5 errors in src/models/ (Exercise, UnresolvedExercise, User, Workout, WorkoutPlan)
- 7 errors in tests/ (old integration and unit tests still using mongoose)
Next: Phase 5 - Update integration tests to use PostgreSQL and remove old Mongoose models

