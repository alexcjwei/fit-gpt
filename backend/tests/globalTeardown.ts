import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

/**
 * Global teardown for Jest tests
 * Stops the PostgreSQL container after all tests complete
 */
export default async function globalTeardown() {
  // @ts-ignore - global is available in Jest
  const postgresContainer: StartedPostgreSqlContainer = global.__POSTGRES_CONTAINER__;

  if (postgresContainer) {
    console.log('Stopping PostgreSQL test container...');
    await postgresContainer.stop();
    console.log('PostgreSQL container stopped');
  }
}
