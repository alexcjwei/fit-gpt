/**
 * @deprecated This file is deprecated. Use TestContainer from './testContainer.ts' instead.
 *
 * The TestContainer class provides isolated PostgreSQL containers for each test suite,
 * enabling parallel test execution without database conflicts.
 *
 * Migration guide:
 * - Replace: import * as testDb from '../../utils/testDb'
 *   With: import { TestContainer } from '../../utils/testContainer'
 *
 * - Replace: await testDb.connect() / const db = testDb.getTestDb()
 *   With: const testContainer = new TestContainer(); const db = await testContainer.start()
 *
 * - Replace: await testDb.clearDatabase()
 *   With: await testContainer.clearDatabase()
 *
 * - Replace: await testDb.closeDatabase()
 *   With: await testContainer.stop()
 */

import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../../src/db/types';
import { migrateToLatest, migrateDown } from '../../migrations/runner';
import * as path from 'path';

let testDb: Kysely<Database>;
let pool: Pool;

// Container is started in globalSetup.ts and TEST_DATABASE_URL is set there
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fit_gpt_test';

/**
 * Connect to the test database and run migrations
 * The container is already started by globalSetup.ts
 */
export const connect = async (): Promise<void> => {
  console.log('Connecting to test database:', TEST_DATABASE_URL);

  // Create connection pool
  pool = new Pool({
    connectionString: TEST_DATABASE_URL,
    max: 10,
  });

  // Create Kysely instance
  testDb = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  // Run migrations
  const migrationsPath = path.join(__dirname, '../../migrations');
  await migrateToLatest(testDb, migrationsPath);

  console.log('Test database migrated');
};

/**
 * Drop all tables and close the connection
 */
export const closeDatabase = async (): Promise<void> => {
  console.log('Closing test database connections...');

  if (testDb) {
    // Roll back all migrations (drops all tables)
    const migrationsPath = path.join(__dirname, '../../migrations');

    let hasMore = true;
    while (hasMore) {
      try {
        await migrateDown(testDb, migrationsPath);
        const result = await sql`SELECT * FROM kysely_migration`.execute(testDb);
        hasMore = result.rows.length > 0;
      } catch (error) {
        hasMore = false;
      }
    }

    await testDb.destroy();
    testDb = null as any;
  }

  if (pool && !pool.ended) {
    await pool.end();
    pool = null as any;
  }

  // Also close the app's database connection to prevent Jest from hanging
  const { closeDatabase: closeAppDb } = await import('../../src/db/connection');
  await closeAppDb();
};

/**
 * Remove all data from all tables (but keep the schema)
 */
export const clearDatabase = async (): Promise<void> => {
  if (!testDb) {
    throw new Error('Test database not connected');
  }

  // Truncate all tables in reverse order to respect foreign key constraints
  await sql`TRUNCATE TABLE set_instances CASCADE`.execute(testDb);
  await sql`TRUNCATE TABLE exercise_instances CASCADE`.execute(testDb);
  await sql`TRUNCATE TABLE workout_blocks CASCADE`.execute(testDb);
  await sql`TRUNCATE TABLE workouts CASCADE`.execute(testDb);
  await sql`TRUNCATE TABLE exercise_tags CASCADE`.execute(testDb);
  await sql`TRUNCATE TABLE exercises CASCADE`.execute(testDb);
  await sql`TRUNCATE TABLE users CASCADE`.execute(testDb);
};

/**
 * Get the test database instance (for use in tests)
 */
export const getTestDb = (): Kysely<Database> => {
  if (!testDb) {
    throw new Error('Test database not connected. Call connect() first.');
  }
  return testDb;
};

/**
 * Seed the exercises table with data from the SQL dump file
 * This loads data into existing tables (assumes migrations have already run)
 */
export const seedExercises = async (): Promise<void> => {
  if (!testDb) {
    throw new Error('Test database not connected');
  }

  const seedFile = path.join(__dirname, '../fixtures/exercises_seed.sql');

  // Get database connection string from environment
  const dbUrl = process.env.TEST_DATABASE_URL;
  if (!dbUrl) {
    throw new Error('TEST_DATABASE_URL not set');
  }

  // Use psql to load the SQL file (handles all SQL syntax properly)
  const { execSync } = await import('child_process');
  execSync(`psql "${dbUrl}" -f "${seedFile}"`, { stdio: 'pipe' });

  console.log('Exercises seeded from fixtures');
};
