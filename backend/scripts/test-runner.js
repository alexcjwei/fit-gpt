#!/usr/bin/env node

/**
 * Test runner script that handles different test types
 * Usage:
 *   npm test          -> runs all tests (unit + integration)
 *   npm test unit     -> runs only unit tests
 *   npm test integration -> runs only integration tests
 */

const { execSync } = require('child_process');

const args = process.argv.slice(2);
const testType = args[0];

try {
  if (testType === 'unit') {
    console.log('Running unit tests only...\n');
    execSync('jest --config jest.config.unit.js', { stdio: 'inherit' });
  } else if (testType === 'integration') {
    console.log('Running integration tests only...\n');
    execSync('jest --config jest.config.integration.js', { stdio: 'inherit' });
  } else {
    // Run all tests
    console.log('Running all tests...\n');
    console.log('=== Unit Tests ===\n');
    execSync('jest --config jest.config.unit.js', { stdio: 'inherit' });
    console.log('\n=== Integration Tests ===\n');
    execSync('jest --config jest.config.integration.js', { stdio: 'inherit' });
  }
} catch (error) {
  process.exit(error.status || 1);
}
