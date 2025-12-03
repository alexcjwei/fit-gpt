import { TestContainer } from '../../tests/utils/testContainer';
import { createOrchestrator } from '../../src/services/workoutParser/orchestrator';
import { LLMService } from '../../src/services/llm.service';
import { createTokenCounter } from '../../src/services/tokenCounter.service';
import { createExerciseRepository } from '../../src/repositories/ExerciseRepository';
import { createEmbeddingService } from '../../src/services/embedding.service';
import { createExerciseSearchService } from '../../src/services/exerciseSearch.service';
import { createExerciseCreationService } from '../../src/services/exerciseCreation.service';
import {
  assertWorkoutStructure,
  type ExpectedWorkout,
  type WorkoutAssertionResult,
} from '../assertions/workoutAssertions';
import type { Workout } from '../../src/types/domain';

/**
 * A single test case for the workout parser.
 */
export interface ParseTestCase {
  id: string;
  input: string;
  expected: ExpectedWorkout;
}

/**
 * Result of running a single test case.
 */
export interface ParseTestResult {
  testId: string;
  input: string;
  status: 'pass' | 'fail' | 'error';
  latencyMs: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
  };
  assertionResult?: WorkoutAssertionResult;
  error?: string;
  workout?: Workout;
}

/**
 * Aggregated statistics from running all test cases.
 */
export interface ParseEvalStats {
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  results: ParseTestResult[];
}

/**
 * Runs parser evaluation tests sequentially.
 *
 * @param testCases - Array of test cases to run
 * @param seedFilePath - Path to the exercise seed file to use
 * @returns Aggregated statistics and individual results
 */
export async function runParseEvals(
  testCases: ParseTestCase[],
  seedFilePath: string
): Promise<ParseEvalStats> {
  const testContainer = new TestContainer();
  const results: ParseTestResult[] = [];

  let totalLatencyMs = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let passed = 0;
  let failed = 0;
  let errors = 0;

  try {
    const db = await testContainer.start();
    await testContainer.clearDatabase();
    await testContainer.seedExercises(seedFilePath);

    const exerciseRepository = createExerciseRepository(db);
    const tokenCounter = createTokenCounter();
    const llmService = new LLMService(tokenCounter);

    const embeddingService = createEmbeddingService();
    const searchService = createExerciseSearchService(
      exerciseRepository,
      embeddingService
    );
    const creationService = createExerciseCreationService(
      exerciseRepository,
      llmService,
      embeddingService
    );

    const orchestrator = createOrchestrator(
      llmService,
      searchService,
      creationService,
      exerciseRepository
    );

    for (const testCase of testCases) {
      const startTime = Date.now();
      let result: ParseTestResult;

      tokenCounter.reset();

      try {
        const workout = await orchestrator.parse(testCase.input);
        const latencyMs = Date.now() - startTime;
        const tokenUsage = tokenCounter.getUsage();
        const assertionResult = assertWorkoutStructure(
          workout,
          testCase.expected
        );

        const status = assertionResult.pass ? 'pass' : 'fail';
        if (status === 'pass') {
          passed++;
        } else {
          failed++;
        }

        result = {
          testId: testCase.id,
          input: testCase.input,
          status,
          latencyMs,
          tokenUsage,
          assertionResult,
          workout,
        };

        totalLatencyMs += latencyMs;
        totalInputTokens += tokenUsage.inputTokens;
        totalOutputTokens += tokenUsage.outputTokens;
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        errors++;

        result = {
          testId: testCase.id,
          input: testCase.input,
          status: 'error',
          latencyMs,
          tokenUsage: { inputTokens: 0, outputTokens: 0 },
          error: error instanceof Error ? error.message : String(error),
        };

        totalLatencyMs += latencyMs;
      }

      results.push(result);
    }
  } finally {
    await testContainer.stop();
  }

  const sortedLatencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  const p95Index = Math.ceil(sortedLatencies.length * 0.95) - 1;
  const p95LatencyMs = sortedLatencies.length > 0 ? sortedLatencies[Math.max(0, p95Index)] : 0;

  const stats: ParseEvalStats = {
    totalTests: testCases.length,
    passed,
    failed,
    errors,
    totalLatencyMs,
    avgLatencyMs: testCases.length > 0 ? totalLatencyMs / testCases.length : 0,
    p95LatencyMs,
    totalInputTokens,
    totalOutputTokens,
    avgInputTokens: testCases.length > 0 ? totalInputTokens / testCases.length : 0,
    avgOutputTokens: testCases.length > 0 ? totalOutputTokens / testCases.length : 0,
    results,
  };

  return stats;
}
