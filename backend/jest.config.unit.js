module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/unit/**/*.spec.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/server.ts',
  ],
  testTimeout: 10000, // 10 second timeout for unit tests
  setupFiles: ['<rootDir>/tests/setup.ts'], // Set NODE_ENV=test before tests run
  // No globalSetup/globalTeardown - unit tests don't need database
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
