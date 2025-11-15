// Set NODE_ENV to test before any modules are imported
process.env.NODE_ENV = 'test';

// Set test database URL for the app to use
// Note: If using a test container, this should be set before this file runs
if (!process.env.TEST_DATABASE_URL) {
  // Default to local test database if not set by container
  process.env.TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/fit_gpt_test';
}

// Set dummy ANTHROPIC_API_KEY for unit tests (not actually used in mocked tests)
if (!process.env.ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-api-key';
}
