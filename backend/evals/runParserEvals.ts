#!/usr/bin/env node
/**
 * CLI script to run parser evaluation tests.
 *
 * Usage:
 *   npm run eval:parser
 *   npm run eval:parser -- --dataset=custom-cases.jsonl
 *
 * Results are saved to evals/results/ with timestamp.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { runParseEvals, type ParseTestCase } from './runners/parseEvalRunner';
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string): string => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};

const DATASET_FILE = getArg('dataset', 'workout-parsing.jsonl');

const EVALS_DIR = resolve(__dirname);
const DATASETS_DIR = join(EVALS_DIR, 'datasets');
const RESULTS_DIR = join(EVALS_DIR, 'results');

async function main() {
  console.log('🏋️  Parser Evaluation Runner\n');
  console.log(`Dataset: ${DATASET_FILE}\n`);

  const fixturesDir = resolve(__dirname, '../tests/fixtures');
  const seedFilePath = join(fixturesDir, 'exercises_seed.sql');
  const { realpathSync } = await import('fs');
  const resolvedPath = realpathSync(seedFilePath);
  const fixtureVersion = resolvedPath.split('/').pop() || 'unknown';

  const datasetPath = join(DATASETS_DIR, DATASET_FILE);
  let testCases: ParseTestCase[];

  try {
    const fileContent = readFileSync(datasetPath, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(Boolean);
    testCases = lines.map((line) => JSON.parse(line) as ParseTestCase);
    console.log(`✓ Loaded ${testCases.length} test cases\n`);
  } catch (error) {
    console.error(`✗ Failed to load dataset: ${error}`);
    process.exit(1);
  }

  if (testCases.length === 0) {
    console.log('No test cases found. Exiting.');
    process.exit(0);
  }

  console.log('Running evaluations...\n');
  const startTime = Date.now();
  const stats = await runParseEvals(testCases, resolvedPath);
  const totalTime = Date.now() - startTime;

  console.log('\n' + '='.repeat(60));
  console.log('EVALUATION RESULTS');
  console.log('='.repeat(60));
  console.log(`Fixture:         ${fixtureVersion}`);
  console.log('');
  console.log(`Total Tests:     ${stats.totalTests}`);
  console.log(`Passed:          ${stats.passed} (${((stats.passed / stats.totalTests) * 100).toFixed(1)}%)`);
  console.log(`Failed:          ${stats.failed} (${((stats.failed / stats.totalTests) * 100).toFixed(1)}%)`);
  console.log(`Errors:          ${stats.errors} (${((stats.errors / stats.totalTests) * 100).toFixed(1)}%)`);
  console.log('');
  console.log(`Total Latency:   ${stats.totalLatencyMs.toLocaleString()}ms`);
  console.log(`Avg Latency:     ${Math.round(stats.avgLatencyMs).toLocaleString()}ms`);
  console.log(`P95 Latency:     ${Math.round(stats.p95LatencyMs).toLocaleString()}ms`);
  console.log('');
  console.log(`Input Tokens:    ${stats.totalInputTokens.toLocaleString()} (avg: ${Math.round(stats.avgInputTokens).toLocaleString()})`);
  console.log(`Output Tokens:   ${stats.totalOutputTokens.toLocaleString()} (avg: ${Math.round(stats.avgOutputTokens).toLocaleString()})`);
  console.log(`Total Tokens:    ${(stats.totalInputTokens + stats.totalOutputTokens).toLocaleString()}`);
  console.log('');
  console.log(`Wall Time:       ${(totalTime / 1000).toFixed(1)}s`);
  console.log('='.repeat(60) + '\n');

  if (stats.failed > 0) {
    console.log('Failed Cases:');
    stats.results
      .filter((r) => r.status === 'fail')
      .forEach((r) => {
        console.log(`  - ${r.testId}`);
        r.assertionResult?.errors.forEach((err) => {
          console.log(`    • ${err}`);
        });
      });
    console.log('');
  }

  if (stats.errors > 0) {
    console.log('Error Cases:');
    stats.results
      .filter((r) => r.status === 'error')
      .forEach((r) => {
        console.log(`  - ${r.testId}: ${r.error}`);
      });
    console.log('');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultFile = `parser-eval-${timestamp}.json`;
  const resultPath = join(RESULTS_DIR, resultFile);

  const resultData = {
    metadata: {
      timestamp: new Date().toISOString(),
      dataset: DATASET_FILE,
      fixtureVersion,
      totalCases: testCases.length,
    },
    stats,
  };

  writeFileSync(resultPath, JSON.stringify(resultData, null, 2));
  console.log(`✓ Results saved to: evals/results/${resultFile}\n`);

  process.exit(stats.failed > 0 || stats.errors > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
