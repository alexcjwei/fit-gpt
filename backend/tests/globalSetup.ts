import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let postgresContainer: StartedPostgreSqlContainer;

/**
 * Global setup for Jest tests
 * Starts a PostgreSQL container before all tests run
 * The container will be stopped in globalTeardown.ts
 */
export default async function globalSetup() {
  console.log('Starting PostgreSQL test container...');

  // Start PostgreSQL container
  postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('fit_gpt_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  const connectionUri = postgresContainer.getConnectionUri();
  console.log('PostgreSQL container started:', connectionUri);

  // Set the TEST_DATABASE_URL environment variable for tests to use
  process.env.TEST_DATABASE_URL = connectionUri;

  // Store container info for globalTeardown
  // @ts-ignore - global is available in Jest
  global.__POSTGRES_CONTAINER__ = postgresContainer;
}
