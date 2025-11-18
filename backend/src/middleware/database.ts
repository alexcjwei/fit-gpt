import { Request, Response, NextFunction } from 'express';
import { Kysely } from 'kysely';
import { Database } from '../db/types';

/**
 * Middleware to inject database instance into res.locals
 * This allows controllers and services to access the database without importing the global instance
 */
export function injectDatabase(db: Kysely<Database>) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.locals.db = db;
    next();
  };
}

/**
 * Helper to get database from response locals
 * Throws if database is not injected (middleware not configured properly)
 */
export function getDatabase(res: Response): Kysely<Database> {
  const db = res.locals.db;
  if (!db) {
    throw new Error('Database not injected. Ensure injectDatabase middleware is configured.');
  }
  return db as Kysely<Database>;
}
