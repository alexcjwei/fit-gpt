import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { Database } from './types';
import { env, buildPostgresUri } from '../config/env';

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
 * Reinitialize database connection (used in tests to connect to per-suite database)
 * This closes the existing connection and creates a new one using the current environment variables
 */
export async function reinitializeConnection(): Promise<void> {
  // Close existing connections
  if (dbInstance) {
    await dbInstance.destroy();
  }
  if (pool && !pool.ended) {
    await pool.end();
  }

  // Create new connection using updated environment variables
  const newConnectionString = buildPostgresUri(process.env as any);
  pool = new Pool({
    connectionString: newConnectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  });

  dbInstance = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool,
    }),
  });

  // Update the exported db reference
  db = dbInstance;
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
