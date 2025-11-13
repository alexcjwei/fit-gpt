import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { Database } from './types';
import { env } from '../config/env';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection cannot be established
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(1);
});

// Create Kysely instance with PostgreSQL dialect
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
});

// Graceful shutdown handler
export async function closeDatabase(): Promise<void> {
  await db.destroy();
  await pool.end();
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
