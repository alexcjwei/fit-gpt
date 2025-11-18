import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../../src/db/types';
import { migrateToLatest } from '../../migrations/runner';
import * as path from 'path';
import * as crypto from 'crypto';

let testDb: Kysely<Database>;
let pool: Pool;
let currentDbName: string;

// Container is started in globalSetup.ts and TEST_DATABASE_URL is set there
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fit_gpt_test';

/**
 * Generate a unique database name for this test suite
 * Uses random bytes to prevent collisions when running tests in parallel
 */
const generateDbName = (): string => {
  const randomId = crypto.randomBytes(8).toString('hex');
  return `fit_gpt_test_${randomId}`;
};

/**
 * Connect to the test database and run migrations
 * The container is already started by globalSetup.ts
 * Each test suite gets its own isolated database to enable parallel execution
 */
export const connect = async (): Promise<void> => {
  // Generate a unique database name for this test suite
  currentDbName = generateDbName();
  console.log('Creating test database:', currentDbName);

  // First, connect to the default postgres database to create our test database
  const baseUrl = TEST_DATABASE_URL.substring(0, TEST_DATABASE_URL.lastIndexOf('/'));
  const adminPool = new Pool({
    connectionString: `${baseUrl}/postgres`,
    max: 1,
  });

  const adminDb = new Kysely<any>({
    dialect: new PostgresDialect({ pool: adminPool }),
  });

  // Create the unique database for this test suite
  await sql`CREATE DATABASE ${sql.id(currentDbName)}`.execute(adminDb);

  // Close admin connection (destroy already ends the underlying pool)
  await adminDb.destroy();

  console.log('Database created, connecting to:', currentDbName);

  // Now connect to our newly created database
  const testDbUrl = `${baseUrl}/${currentDbName}`;
  pool = new Pool({
    connectionString: testDbUrl,
    max: 10,
  });

  // Create Kysely instance
  testDb = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  // Run migrations
  const migrationsPath = path.join(__dirname, '../../migrations');
  await migrateToLatest(testDb, migrationsPath);

  console.log('Test database migrated:', currentDbName);
};

/**
 * Drop the test database and close all connections
 * This provides complete isolation between test suites
 */
export const closeDatabase = async (): Promise<void> => {
  console.log('Closing test database connections for:', currentDbName);

  // Close the test database connection
  if (testDb) {
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

  // Now drop the database (connect to postgres db to do this)
  if (currentDbName) {
    console.log('Dropping test database:', currentDbName);
    const baseUrl = TEST_DATABASE_URL.substring(0, TEST_DATABASE_URL.lastIndexOf('/'));
    const adminPool = new Pool({
      connectionString: `${baseUrl}/postgres`,
      max: 1,
    });

    const adminDb = new Kysely<any>({
      dialect: new PostgresDialect({ pool: adminPool }),
    });

    try {
      // Force disconnect all connections to this database before dropping
      await sql`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = ${currentDbName}
          AND pid <> pg_backend_pid()
      `.execute(adminDb);

      // Drop the database
      await sql`DROP DATABASE IF EXISTS ${sql.id(currentDbName)}`.execute(adminDb);
      console.log('Test database dropped:', currentDbName);
    } catch (error) {
      console.error('Error dropping test database:', error);
    } finally {
      // Kysely's destroy() already ends the underlying pool
      await adminDb.destroy();
    }
  }
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

  if (!currentDbName) {
    throw new Error('No current database name set');
  }

  const seedFile = path.join(__dirname, '../fixtures/exercises_seed.sql');

  // Build the connection string for the current test suite's database
  const baseUrl = TEST_DATABASE_URL.substring(0, TEST_DATABASE_URL.lastIndexOf('/'));
  const dbUrl = `${baseUrl}/${currentDbName}`;

  // Use psql to load the SQL file (handles all SQL syntax properly)
  const { execSync } = await import('child_process');
  execSync(`psql "${dbUrl}" -f "${seedFile}"`, { stdio: 'pipe' });

  console.log('Exercises seeded from fixtures');
};
