import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../../src/db/types';
import { migrateToLatest, migrateDown } from '../../migrations/runner';
import * as path from 'path';

/**
 * Test container instance for a single test suite
 * Each test suite gets its own isolated PostgreSQL container and database
 */
export class TestContainer {
  private container: StartedPostgreSqlContainer | null = null;
  private db: Kysely<Database> | null = null;
  private pool: Pool | null = null;

  /**
   * Start a PostgreSQL container and create a database connection
   * This should be called in beforeAll() hook
   */
  async start(): Promise<Kysely<Database>> {
    console.log('Starting isolated PostgreSQL container for test suite...');

    // Start PostgreSQL container with pgvector support
    // Using pgvector/pgvector image which includes the pgvector extension
    this.container = await new PostgreSqlContainer('pgvector/pgvector:pg16')
      .withDatabase('fit_gpt_test')
      .withUsername('postgres')
      .withPassword('postgres')
      .start();

    const connectionUri = this.container.getConnectionUri();
    console.log('PostgreSQL container started:', connectionUri);

    // Create connection pool
    this.pool = new Pool({
      connectionString: connectionUri,
      max: 10,
    });

    // Create Kysely instance
    this.db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: this.pool }),
    });

    // Run migrations
    const migrationsPath = path.join(__dirname, '../../migrations');
    await migrateToLatest(this.db, migrationsPath);

    console.log('Test database migrated');

    return this.db;
  }

  /**
   * Get the database instance
   */
  getDb(): Kysely<Database> {
    if (!this.db) {
      throw new Error('Test database not connected. Call start() first.');
    }
    return this.db;
  }

  /**
   * Clear all data from the database (but keep schema)
   * This should be called in afterEach() hook
   */
  async clearDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error('Test database not connected');
    }

    // Truncate all tables in reverse order to respect foreign key constraints
    await sql`TRUNCATE TABLE set_instances CASCADE`.execute(this.db);
    await sql`TRUNCATE TABLE exercise_instances CASCADE`.execute(this.db);
    await sql`TRUNCATE TABLE workout_blocks CASCADE`.execute(this.db);
    await sql`TRUNCATE TABLE workouts CASCADE`.execute(this.db);
    await sql`TRUNCATE TABLE exercise_tags CASCADE`.execute(this.db);
    await sql`TRUNCATE TABLE exercises CASCADE`.execute(this.db);
    await sql`TRUNCATE TABLE users CASCADE`.execute(this.db);
  }

  /**
   * Stop the container and clean up resources
   * This should be called in afterAll() hook
   */
  async stop(): Promise<void> {
    console.log('Stopping test container...');

    // Close database connection
    if (this.db) {
      // Roll back all migrations (drops all tables)
      const migrationsPath = path.join(__dirname, '../../migrations');

      let hasMore = true;
      while (hasMore) {
        try {
          await migrateDown(this.db, migrationsPath);
          const result = await sql`SELECT * FROM kysely_migration`.execute(this.db);
          hasMore = result.rows.length > 0;
        } catch (error) {
          hasMore = false;
        }
      }

      await this.db.destroy();
      this.db = null;
    }

    // Close pool
    if (this.pool && !this.pool.ended) {
      await this.pool.end();
      this.pool = null;
    }

    // Stop container
    if (this.container) {
      await this.container.stop();
      this.container = null;
      console.log('Test container stopped');
    }
  }

  /**
   * Seed the exercises table with data from the SQL dump file
   */
  async seedExercises(): Promise<void> {
    if (!this.db) {
      throw new Error('Test database not connected');
    }

    if (!this.container) {
      throw new Error('Test container not started');
    }

    const seedFile = path.join(__dirname, '../fixtures/exercises_seed.sql');
    const dbUrl = this.container.getConnectionUri();

    // Use psql to load the SQL file (handles all SQL syntax properly)
    const { execSync } = await import('child_process');
    execSync(`psql "${dbUrl}" -f "${seedFile}"`, { stdio: 'pipe' });

    console.log('Exercises seeded from fixtures');
  }
}
