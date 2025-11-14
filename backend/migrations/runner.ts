import { Kysely, Migrator, Migration, MigrationProvider } from 'kysely';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Custom migration provider that loads migration files from the migrations directory
 */
class FileMigrationProvider implements MigrationProvider {
  constructor(private migrationsPath: string) {}

  async getMigrations(): Promise<Record<string, Migration>> {
    const migrations: Record<string, Migration> = {};

    // Read all .ts and .js files in the migrations directory
    const files = await fs.readdir(this.migrationsPath);
    const migrationFiles = files
      .filter((file) => {
        // Only include migration files (exclude runner.ts)
        return (file.endsWith('.ts') || file.endsWith('.js')) && file !== 'runner.ts' && file !== 'runner.js';
      })
      .sort(); // Sort to ensure migrations run in order

    // Import each migration file
    for (const file of migrationFiles) {
      const migrationName = file.replace(/\.(ts|js)$/, '');
      const migrationPath = path.join(this.migrationsPath, file);

      // Use require for CommonJS compatibility
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const migration = require(migrationPath);

      if (!migration.up || !migration.down) {
        throw new Error(
          `Migration ${migrationName} must export both 'up' and 'down' functions`
        );
      }

      migrations[migrationName] = {
        up: migration.up,
        down: migration.down,
      };
    }

    return migrations;
  }
}

/**
 * Creates a migrator instance for the given database
 */
export function createMigrator(db: Kysely<any>, migrationsPath: string): Migrator {
  return new Migrator({
    db,
    provider: new FileMigrationProvider(migrationsPath),
  });
}

/**
 * Runs all pending migrations
 */
export async function migrateToLatest(db: Kysely<any>, migrationsPath: string): Promise<void> {
  const migrator = createMigrator(db, migrationsPath);

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`✓ Migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`✗ Failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('Failed to migrate:');
    console.error(error);
    throw error;
  }

  if (!results || results.length === 0) {
    console.log('No pending migrations');
  }
}

/**
 * Rolls back the last batch of migrations
 */
export async function migrateDown(db: Kysely<any>, migrationsPath: string): Promise<void> {
  const migrator = createMigrator(db, migrationsPath);

  const { error, results } = await migrator.migrateDown();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`✓ Migration "${it.migrationName}" was rolled back successfully`);
    } else if (it.status === 'Error') {
      console.error(`✗ Failed to roll back migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('Failed to roll back:');
    console.error(error);
    throw error;
  }

  if (!results || results.length === 0) {
    console.log('No migrations to roll back');
  }
}
