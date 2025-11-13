# Phase 1: Setup & Infrastructure

## Objectives
- Set up PostgreSQL development environment with Docker
- Install required dependencies
- Remove MongoDB dependencies
- Create database connection infrastructure
- Establish Kysely type-safe query builder setup

## Tasks

### 1. Docker PostgreSQL Setup
- Create `docker-compose.yml` in project root
- Configure PostgreSQL service with:
  - Image: `postgres:16-alpine`
  - Port: 5432
  - Database: `fit_gpt_dev`
  - User/password from environment
  - Volume for data persistence
- Add `.dockerignore` if needed

### 2. Update Dependencies
**Add:**
- `kysely` - Type-safe SQL query builder
- `pg` - PostgreSQL client for Node.js
- `@types/pg` - TypeScript types for pg

**Remove:**
- `mongoose` - MongoDB ODM
- `mongodb-memory-server` - In-memory MongoDB for tests (will replace in Phase 2)

**Commands:**
```bash
cd backend
npm install kysely pg
npm install --save-dev @types/pg
npm uninstall mongoose mongodb-memory-server
```

### 3. Create Database Directory Structure
```
backend/src/db/
├── connection.ts       # Connection pool setup
├── types.ts           # Kysely database interface types
└── index.ts           # Public exports
```

### 4. Environment Configuration
**Update `backend/src/config/env.ts`:**
- Remove MongoDB-related environment variables
- Add PostgreSQL environment variables:
  - `POSTGRES_HOST` (default: localhost)
  - `POSTGRES_PORT` (default: 5432)
  - `POSTGRES_DB` (default: fit_gpt_dev)
  - `POSTGRES_USER` (default: postgres)
  - `POSTGRES_PASSWORD` (required)
  - `DATABASE_URL` (Railway's pre-constructed connection string, optional)

**Update `.env.example`:**
- Remove MONGO variables
- Add POSTGRES variables with example values

### 5. Create Kysely Database Types
**File: `backend/src/db/types.ts`**

Define TypeScript interfaces for all 8 tables:
1. `UsersTable` - users table structure
2. `ExercisesTable` - exercises table structure
3. `ExerciseTagsTable` - exercise_tags junction table
4. `WorkoutsTable` - workouts table structure
5. `WorkoutBlocksTable` - workout_blocks table structure
6. `ExerciseInstancesTable` - exercise_instances table structure
7. `SetInstancesTable` - set_instances table structure
8. `UnresolvedExercisesTable` - unresolved_exercises table structure

Create `Database` interface that maps table names to types.

### 6. Create Connection Pool Module
**File: `backend/src/db/connection.ts`**

- Create PostgreSQL connection pool using `pg.Pool`
- Create Kysely instance with PostgreSQL dialect
- Export typed database instance
- Add connection error handling
- Add graceful shutdown handler

**File: `backend/src/db/index.ts`**
- Re-export database instance and types

### 7. Update Database Config
**File: `backend/src/config/database.ts`**

- Remove Mongoose connection code
- Add PostgreSQL connection initialization
- Test connection on startup
- Add error logging

### 8. Verification
- Start Docker PostgreSQL: `docker-compose up -d`
- Run type check: `npm run type-check`
- Verify connection can be established

## Expected File Changes
- **New:** `docker-compose.yml`
- **New:** `backend/src/db/connection.ts`
- **New:** `backend/src/db/types.ts`
- **New:** `backend/src/db/index.ts`
- **Modified:** `backend/package.json`
- **Modified:** `backend/src/config/env.ts`
- **Modified:** `backend/src/config/database.ts`
- **Modified:** `.env.example`

## Success Criteria
- [ ] Docker PostgreSQL container running
- [ ] PostgreSQL dependencies installed
- [ ] Mongoose dependencies removed
- [ ] Kysely types defined for all 8 tables
- [ ] Connection pool established
- [ ] Type check passes
- [ ] Backend can connect to PostgreSQL successfully
- [ ] No compilation errors

## Notes
- Keep Mongoose models intact for reference (will remove in Phase 6)
- Don't delete any service code yet
- Focus purely on infrastructure setup
- All table structures based on exploration summary
