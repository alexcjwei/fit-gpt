MongoDB to PostgreSQL Migration Plan

     Key Design Decisions

     - Schema: Fully normalized with separate tables for nested structures (workouts → blocks → exercise_instances → set_instances)
     - Primary Keys: BIGSERIAL for all tables
     - User fields: Remove goals and availableEquipment fields entirely
     - Exercise tags: Normalize into exercise_tags junction table
     - Query Builder: Kysely for type-safe queries
     - Search: Migrate from Fuse.js to PostgreSQL pg_trgm extension
     - Scope: Skip WorkoutPlan model (unused)

     Phase 1: Setup & Infrastructure (CLAUDE_MIGRATION_PHASE_1.md)

     1. Set up local PostgreSQL with Docker (docker-compose.yml)
     2. Install dependencies: kysely, pg, remove mongoose
     3. Create backend/src/db/ directory structure
     4. Create Kysely database types file
     5. Create connection pool module with environment config
     6. Update .env.example with Postgres vars

     Phase 2: Schema & Migrations (CLAUDE_MIGRATION_PHASE_2.md)

     1. Create backend/migrations/ folder
     2. Build migration runner script (up/down support, tracking table)
     3. Write 001_initial_schema.ts migration:
       - Enable pg_trgm extension
       - Create 8 tables: users, exercises, exercise_tags, workouts, workout_blocks, exercise_instances, set_instances, unresolved_exercises
       - Add all indexes including GIN index for trigram search
     4. Test migration up/down locally
     5. Update seedExercises.ts to use Kysely with ON CONFLICT
     6. Replace mongodb-memory-server in tests with Docker postgres:alpine

     Phase 3: Repository Layer (CLAUDE_MIGRATION_PHASE_3.md)

     1. Create repository interfaces in backend/src/repositories/
     2. Implement Postgres repositories using Kysely:
       - UserRepository (simpler without goals/equipment)
       - ExerciseRepository (with tags junction logic)
       - WorkoutRepository (complex multi-table operations)
       - UnresolvedExerciseRepository
     3. Write repository unit tests
     4. Keep Mongoose models as reference during transition

     Phase 4: Service Layer (CLAUDE_MIGRATION_PHASE_4.md)

     1. Update services to use repositories instead of Mongoose models
     2. Refactor workout.service.ts complex queries:
       - Batch exercise loading → JOIN or WHERE IN
       - Nested updates → multi-table transactions
       - Nested queries → JOINs
     3. Replace Fuse.js with pg_trgm similarity search
     4. Update type conversion functions
     5. Run service/unit tests, fix incrementally

     Phase 5: Integration Tests (CLAUDE_MIGRATION_PHASE_5.md)

     1. Update testDb.ts to use Docker postgres container
     2. Run all integration tests
     3. Fix failures (should be minimal with prior testing)
     4. Update CI/CD to use Postgres service

     Phase 6: Deployment (CLAUDE_MIGRATION_PHASE_6.md)

     1. Set up Railway Postgres database
     2. Run migrations on staging/prod
     3. Deploy backend
     4. Monitor for issues
     5. Remove Mongoose code after stability confirmed

     Each phase will have a detailed markdown file created before starting, and progress logged to CLAUDE_MIGRATION_LOG.md with single-line append-only entries.