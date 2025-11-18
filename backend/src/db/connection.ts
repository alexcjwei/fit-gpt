import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { Database } from './types';
import { env } from '../config/env';

// Create PostgreSQL connection pool
let pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection cannot be established
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  // Don't exit during tests
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

// Create Kysely instance with PostgreSQL dialect
let dbInstance = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
});

// Export db - this will always point to the current instance
export let db = dbInstance;

// Graceful shutdown handler
export async function closeDatabase(): Promise<void> {
  await dbInstance.destroy();
  if (pool && !pool.ended) {
    await pool.end();
  }
}

/**
 * Update the global database instance (ONLY for tests)
 * This allows tests to point the global db to their per-suite database
 * so that services still using the global db import work correctly
 */
export function updateGlobalDb(newDb: Kysely<Database>): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('updateGlobalDb can only be called in test environment');
  }
  db = newDb;
  dbInstance = newDb;
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing database connection');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing database connection');
  await closeDatabase();
  process.exit(0);
});
