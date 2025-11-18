module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/server.ts',
  ],
  testTimeout: 30000, // 30 second timeout for integration tests with LLM API
  maxWorkers: 1, // Run tests sequentially to avoid database deadlocks
  setupFiles: ['<rootDir>/tests/setup.ts'], // Set NODE_ENV=test before tests run
  globalSetup: '<rootDir>/tests/globalSetup.ts', // Start PostgreSQL container before all tests
  globalTeardown: '<rootDir>/tests/globalTeardown.ts', // Stop PostgreSQL container after all tests
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
