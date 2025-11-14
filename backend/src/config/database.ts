import { sql } from 'kysely';
import { db } from '../db';
import { env } from './env';

export const connectDatabase = async (): Promise<void> => {
  try {
    // Extract host from DATABASE_URL for logging (hide credentials)
    const urlMatch = env.DATABASE_URL.match(/@([^:\/]+)/);
    const host = urlMatch ? urlMatch[1] : 'database';

    console.log(`PostgreSQL URI loaded: postgresql://***@${host}/***`);

    // Test the connection by running a simple query
    await sql`SELECT 1`.execute(db);

    console.log(`PostgreSQL Connected: ${host}`);
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
    process.exit(1);
  }
};
