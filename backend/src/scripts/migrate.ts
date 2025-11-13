import * as path from 'path';
import { db } from '../db';
import { env } from '../config/env';
import { migrateToLatest, migrateDown } from '../../migrations/runner';

const command = process.argv[2];
const migrationsPath = path.join(__dirname, '../../migrations');

async function main() {
  try {
    console.log('DATABASE_URL:', env.DATABASE_URL.substring(0, 50) + '...');

    if (command === 'up' || command === 'latest') {
      console.log('Running migrations...');
      await migrateToLatest(db, migrationsPath);
      console.log('✓ All migrations completed');
    } else if (command === 'down') {
      console.log('Rolling back last migration...');
      await migrateDown(db, migrationsPath);
      console.log('✓ Rollback completed');
    } else {
      console.error('Usage: npm run migrate:up OR npm run migrate:down');
      process.exit(1);
    }

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await db.destroy();
    process.exit(1);
  }
}

main();
