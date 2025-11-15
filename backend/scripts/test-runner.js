#!/usr/bin/env node

/**
 * Test runner script that handles different test types
 * Usage:
 *   npm test                    -> runs all tests (unit + integration)
 *   npm test unit               -> runs only unit tests
 *   npm test integration        -> runs only integration tests
 *   npm test -- tests/unit/...  -> runs specific unit tests
 *   npm test -- tests/integration/... -> runs specific integration tests
 */

const { execSync } = require('child_process');

const args = process.argv.slice(2);
const firstArg = args[0];

try {
  if (firstArg === 'unit') {
    // Run all unit tests
    console.log('Running unit tests only...\n');
    execSync('jest --config jest.config.unit.js', { stdio: 'inherit' });
  } else if (firstArg === 'integration') {
    // Run all integration tests
    console.log('Running integration tests only...\n');
    execSync('jest --config jest.config.integration.js', { stdio: 'inherit' });
  } else if (firstArg && firstArg.startsWith('tests/unit')) {
    // Run specific unit tests
    const pathArgs = args.join(' ');
    console.log(`Running unit tests matching: ${pathArgs}\n`);
    execSync(`jest --config jest.config.unit.js ${pathArgs}`, { stdio: 'inherit' });
  } else if (firstArg && firstArg.startsWith('tests/integration')) {
    // Run specific integration tests
    const pathArgs = args.join(' ');
    console.log(`Running integration tests matching: ${pathArgs}\n`);
    execSync(`jest --config jest.config.integration.js ${pathArgs}`, { stdio: 'inherit' });
  } else if (firstArg) {
    // Unknown argument - try to run with both configs and see which matches
    console.log(`Running tests matching: ${args.join(' ')}\n`);
    const pathArgs = args.join(' ');
    try {
      execSync(`jest --config jest.config.unit.js ${pathArgs}`, { stdio: 'inherit' });
    } catch (e) {
      // If unit tests fail, try integration
      execSync(`jest --config jest.config.integration.js ${pathArgs}`, { stdio: 'inherit' });
    }
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
