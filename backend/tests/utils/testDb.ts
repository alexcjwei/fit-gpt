import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../../src/db/types';
import { migrateToLatest, migrateDown } from '../../migrations/runner';
import * as path from 'path';

let testDb: Kysely<Database>;
let pool: Pool;

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fit_gpt_test';

/**
 * Connect to the test database and run migrations
 */
export const connect = async (): Promise<void> => {
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

  console.log('Test database connected and migrated');
};

/**
 * Drop all tables and close the connection
 */
export const closeDatabase = async (): Promise<void> => {
  if (testDb) {
    // Roll back all migrations (drops all tables)
    const migrationsPath = path.join(__dirname, '../../migrations');

    // Get all migration names and roll them back
    let hasMore = true;
    while (hasMore) {
      try {
        await migrateDown(testDb, migrationsPath);
        // Check if there are more migrations to roll back
        const result = await sql`SELECT * FROM kysely_migration`.execute(testDb);
        hasMore = result.rows.length > 0;
      } catch (error) {
        // No more migrations or error occurred
        hasMore = false;
      }
    }

    // Destroy Kysely instance (this also closes the pool)
    await testDb.destroy();
    testDb = null as any;
    pool = null as any;
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
