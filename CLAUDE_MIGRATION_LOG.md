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
