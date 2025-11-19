module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/tests/integration/**/*.test.ts',
    '**/tests/integration/**/*.spec.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/server.ts',
  ],
  testTimeout: 60000, // 60 second timeout for integration tests with LLM API and database seeding
  maxWorkers: '50%', // Run tests in parallel (50% of available CPU cores) - each test suite has its own isolated container
  setupFiles: ['<rootDir>/tests/setup.ts'], // Set NODE_ENV=test before tests run
  // Note: No globalSetup/globalTeardown - each test suite starts/stops its own isolated PostgreSQL container
  silent: true, // Suppress console output during tests
  verbose: false, // Only show summary, not individual tests (unless they fail)
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
        },
        diagnostics: false,
      },
    ],
  },
};
