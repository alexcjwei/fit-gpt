# Phase 2: Schema & Migrations

## Objectives
- Create migrations infrastructure with up/down support
- Define initial database schema in SQL
- Enable PostgreSQL extensions (pg_trgm for search)
- Update seed script to use PostgreSQL
- Update test database utilities for Docker PostgreSQL

## Database Schema Design

Based on the exploration and design decisions, we'll create 8 tables:

### 1. users
- id: BIGSERIAL PRIMARY KEY
- email: VARCHAR(255) UNIQUE NOT NULL
- password: VARCHAR(255) NOT NULL
- name: VARCHAR(255) NOT NULL
- created_at: TIMESTAMPTZ DEFAULT NOW()
- updated_at: TIMESTAMPTZ DEFAULT NOW()

### 2. exercises
- id: BIGSERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- slug: VARCHAR(255) UNIQUE NOT NULL
- needs_review: BOOLEAN DEFAULT FALSE
- created_at: TIMESTAMPTZ DEFAULT NOW()
- updated_at: TIMESTAMPTZ DEFAULT NOW()

Indexes:
- name (for sorting)
- needs_review (for filtering)
- GIN index on name for trigram search

### 3. exercise_tags
- id: BIGSERIAL PRIMARY KEY
- exercise_id: BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE
- tag: VARCHAR(100) NOT NULL
- UNIQUE(exercise_id, tag)

Indexes:
- exercise_id (for joins)
- tag (for filtering)

### 4. workouts
- id: BIGSERIAL PRIMARY KEY
- user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
- name: VARCHAR(255) NOT NULL
- date: DATE NOT NULL (changed from string to proper DATE type)
- last_modified_time: TIMESTAMPTZ NOT NULL
- notes: TEXT
- created_at: TIMESTAMPTZ DEFAULT NOW()
- updated_at: TIMESTAMPTZ DEFAULT NOW()

Indexes:
- user_id
- (user_id, date) compound for date queries
- (user_id, last_modified_time) compound for recent workouts

### 5. workout_blocks
- id: BIGSERIAL PRIMARY KEY
- workout_id: BIGINT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE
- label: VARCHAR(255)
- notes: TEXT
- order_in_workout: INTEGER NOT NULL

Indexes:
- workout_id
- (workout_id, order_in_workout) for ordered queries

### 6. exercise_instances
- id: BIGSERIAL PRIMARY KEY
- workout_block_id: BIGINT NOT NULL REFERENCES workout_blocks(id) ON DELETE CASCADE
- exercise_id: BIGINT NOT NULL REFERENCES exercises(id)
- order_in_block: INTEGER NOT NULL
- instruction: TEXT
- notes: TEXT

Indexes:
- workout_block_id
- exercise_id (for joins to get exercise names)
- (workout_block_id, order_in_block) for ordered queries

### 7. set_instances
- id: BIGSERIAL PRIMARY KEY
- exercise_instance_id: BIGINT NOT NULL REFERENCES exercise_instances(id) ON DELETE CASCADE
- set_number: INTEGER NOT NULL
- reps: INTEGER
- weight: NUMERIC(10, 2)
- weight_unit: VARCHAR(10) CHECK IN ('lbs', 'kg') NOT NULL
- duration: INTEGER (seconds)
- rpe: INTEGER CHECK (1-10)
- notes: TEXT

Indexes:
- exercise_instance_id
- (exercise_instance_id, set_number) for ordered queries

## Tasks

### 1. Create Migrations Directory Structure
```
backend/migrations/
├── 001_initial_schema.ts
└── runner.ts
```

Also create:
```
backend/scripts/
└── migrate.ts
```

### 2. Build Migration Runner
**File: `backend/migrations/runner.ts`**

Features:
- Create `migrations` tracking table if not exists
- Read all migration files in order
- Execute `up()` or `down()` based on command
- Track completed migrations in database
- Support rollback to specific migration
- Transaction support for each migration

**File: `backend/scripts/migrate.ts`**

CLI script that:
- Accepts `up` or `down` command
- Uses the migration runner
- Provides user feedback

Add npm scripts to package.json:
- `"migrate:up": "tsx src/scripts/migrate.ts up"`
- `"migrate:down": "tsx src/scripts/migrate.ts down"`
- `"migrate:latest": "tsx src/scripts/migrate.ts up"`

### 3. Create Initial Schema Migration
**File: `backend/migrations/001_initial_schema.ts`**

Export `up()` and `down()` functions using Kysely schema builder:
- `up()`: Create all 8 tables with indexes and constraints
- `down()`: Drop all tables in reverse order

Include:
- Enable pg_trgm extension
- Create all tables
- Add all indexes
- Add all foreign key constraints
- Add CHECK constraints for enums

### 4. Update Seed Script
**File: `backend/src/scripts/seedExercises.ts`**

Replace Mongoose with Kysely:
- Use Kysely connection instead of Mongoose
- Replace `bulkWrite()` with Kysely transaction
- Use `ON CONFLICT (slug) DO UPDATE` for upserts
- Handle tags separately (insert into exercise_tags table)
- Use proper WHERE NOT IN for deletion

Keep CSV parsing logic the same.

### 5. Update Test Database Utilities
**File: `backend/tests/utils/testDb.ts`**

Replace mongodb-memory-server with Docker PostgreSQL approach:
- Create separate test database (fit_gpt_test)
- Use Kysely for test database operations
- `connect()`: Create test DB if not exists, run migrations
- `clearDatabase()`: TRUNCATE all tables with CASCADE
- `closeDatabase()`: Close connections

Alternative: Use separate Docker container for tests, or use same container with different database.

### 6. Run Initial Migration
Execute the migration:
```bash
npm run migrate:up
```

Verify tables created:
```bash
docker exec fit-gpt-postgres psql -U postgres -d fit_gpt_dev -c "\dt"
```

### 7. Test Seed Script
Run the updated seed script:
```bash
tsx src/scripts/seedExercises.ts
```

Verify data:
```bash
docker exec fit-gpt-postgres psql -U postgres -d fit_gpt_dev -c "SELECT COUNT(*) FROM exercises"
```

## Expected File Changes
- **New:** `backend/migrations/runner.ts`
- **New:** `backend/migrations/001_initial_schema.ts`
- **New:** `backend/scripts/migrate.ts`
- **Modified:** `backend/src/scripts/seedExercises.ts`
- **Modified:** `backend/tests/utils/testDb.ts`
- **Modified:** `backend/package.json` (add migrate scripts)

## Success Criteria
- [ ] Migration runner infrastructure works
- [ ] Initial migration creates all 8 tables successfully
- [ ] All indexes and constraints are in place
- [ ] Migration rollback works (down migration)
- [ ] Seed script successfully populates exercises
- [ ] Tags are properly normalized into exercise_tags table
- [ ] Test utilities can set up/teardown test database
- [ ] Type check passes for migration code

## Notes
- Use transactions for all migrations
- Ensure ON DELETE CASCADE is set correctly
- pg_trgm extension needed for fuzzy search later
- Test both up and down migrations
- Seed script should be idempotent (safe to run multiple times)
