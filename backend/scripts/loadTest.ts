/**
 * Load Testing Script for Workout Parser API
 *
 * Tests the system's ability to handle concurrent workout parsing requests.
 * Measures response times, success rates, and identifies bottlenecks.
 *
 * Usage:
 *   npm run test:load -- --concurrent 50 --total 100
 *   npm run test:load -- --concurrent 10 --total 50 --rampup 5000
 */

import request from 'supertest';
import { createApp } from '../src/createApp';
import { db } from '../src/config/database';
import { Express } from 'express';

// ============================================================================
// Configuration
// ============================================================================

interface LoadTestConfig {
  concurrent: number;      // Number of simultaneous requests
  total: number;          // Total number of requests to make
  rampUpMs: number;       // Time to ramp up to max concurrency (ms)
  timeoutMs: number;      // Request timeout (ms)
  verbose: boolean;       // Print detailed logs
}

// Parse command line arguments
function parseArgs(): LoadTestConfig {
  const args = process.argv.slice(2);
  const config: LoadTestConfig = {
    concurrent: 50,
    total: 100,
    rampUpMs: 0,
    timeoutMs: 120000, // 2 minutes
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--concurrent':
      case '-c':
        config.concurrent = parseInt(args[++i], 10);
        break;
      case '--total':
      case '-t':
        config.total = parseInt(args[++i], 10);
        break;
      case '--rampup':
      case '-r':
        config.rampUpMs = parseInt(args[++i], 10);
        break;
      case '--timeout':
        config.timeoutMs = parseInt(args[++i], 10);
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
    }
  }

  return config;
}

// ============================================================================
// Sample Workouts (Varying Complexity)
// ============================================================================

const SAMPLE_WORKOUTS = [
  // Simple workout (5-10 exercises)
  `Push Day
Bench Press: 4x8 @ 185 lbs
Incline DB Press: 3x10 @ 60 lbs
Cable Flyes: 3x12 @ 30 lbs
Overhead Press: 3x8 @ 95 lbs
Lateral Raises: 3x15 @ 20 lbs`,

  // Medium complexity (10-15 exercises)
  `Upper Body
Warm Up (5 mins)
- Arm circles: 10 each direction
- Band pull-aparts: 15 reps

Superset A (3 rounds)
- Push-ups: 12-15 reps
- Single-arm DB rows: 10 each arm @ 50 lbs

Superset B (3 rounds)
- DB shoulder press: 10 reps @ 40 lbs
- Inverted rows: 10-12 reps

Cool Down
- Stretching: 5 mins`,

  // Complex workout (15+ exercises)
  `Full Body + Core
Warm Up (5 mins)
- Jogging: 3 min
- Dynamic stretches: 2 min

Main Lifts
- Squats: 5x5 @ 225 lbs
- Deadlifts: 3x5 @ 275 lbs
- Bench Press: 4x8 @ 185 lbs

Superset A (3 rounds, 90 sec rest)
- Push-ups: 12-15 reps
- DB rows: 10 each arm @ 50 lbs
- Shoulder press: 10 reps @ 40 lbs

Superset B (3 rounds, 60 sec rest)
- Lateral raises: 12 reps @ 20 lbs
- DB pullovers: 10 reps @ 35 lbs
- Anti-rotation press: 10 each side

Core Circuit (3 rounds)
- Pallof press: 8 each side
- Bicycle crunches: 20 total
- Bird dogs: 10 each side
- Hollow body hold: 30 sec

Cool Down
- Stretching: 5 mins`,
];

// ============================================================================
// Metrics Collection
// ============================================================================

interface RequestResult {
  requestId: number;
  status: 'success' | 'error' | 'timeout';
  statusCode?: number;
  durationMs: number;
  errorMessage?: string;
  errorType?: 'network' | 'timeout' | 'server' | 'validation';
  startTime: number;
  endTime: number;
}

interface LoadTestMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  timeoutCount: number;

  // Response times (ms)
  responseTimes: number[];

  // Errors by type
  errorsByType: Map<string, number>;

  // Resource usage
  startMemoryMB: number;
  endMemoryMB: number;
  peakMemoryMB: number;

  // Timing
  testStartTime: number;
  testEndTime: number;
  totalDurationMs: number;

  // Results
  results: RequestResult[];
}

// ============================================================================
// Load Testing Logic
// ============================================================================

class LoadTester {
  private app: Express;
  private config: LoadTestConfig;
  private metrics: LoadTestMetrics;

  constructor(app: Express, config: LoadTestConfig) {
    this.app = app;
    this.config = config;
    this.metrics = {
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      timeoutCount: 0,
      responseTimes: [],
      errorsByType: new Map(),
      startMemoryMB: 0,
      endMemoryMB: 0,
      peakMemoryMB: 0,
      testStartTime: 0,
      testEndTime: 0,
      totalDurationMs: 0,
      results: [],
    };
  }

  /**
   * Make a single workout parse request
   */
  private async makeRequest(requestId: number): Promise<RequestResult> {
    const startTime = Date.now();
    const workoutText = SAMPLE_WORKOUTS[requestId % SAMPLE_WORKOUTS.length];

    if (this.config.verbose) {
      console.log(`[Request ${requestId}] Starting...`);
    }

    try {
      const response = await request(this.app)
        .post('/api/workouts/parse')
        .send({
          workoutText,
          date: '2024-11-15',
          weightUnit: 'lbs',
        })
        .timeout(this.config.timeoutMs);

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      if (this.config.verbose) {
        console.log(`[Request ${requestId}] ✓ Completed in ${durationMs}ms (${response.status})`);
      }

      // Track peak memory
      const currentMemoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
      this.metrics.peakMemoryMB = Math.max(this.metrics.peakMemoryMB, currentMemoryMB);

      if (response.status >= 200 && response.status < 300) {
        return {
          requestId,
          status: 'success',
          statusCode: response.status,
          durationMs,
          startTime,
          endTime,
        };
      } else {
        return {
          requestId,
          status: 'error',
          statusCode: response.status,
          durationMs,
          errorType: 'server',
          errorMessage: response.body?.message || `HTTP ${response.status}`,
          startTime,
          endTime,
        };
      }
    } catch (error: any) {
      const endTime = Date.now();
      const durationMs = endTime - startTime;

      let errorType: 'network' | 'timeout' | 'server' | 'validation' = 'network';
      let errorMessage = error.message;

      if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
        errorType = 'network';
      } else if (error.timeout || durationMs >= this.config.timeoutMs) {
        errorType = 'timeout';
      } else if (error.status >= 400 && error.status < 500) {
        errorType = 'validation';
      } else {
        errorType = 'server';
      }

      if (this.config.verbose) {
        console.log(`[Request ${requestId}] ✗ Failed: ${errorType} - ${errorMessage}`);
      }

      return {
        requestId,
        status: errorType === 'timeout' ? 'timeout' : 'error',
        statusCode: error.status,
        durationMs,
        errorType,
        errorMessage,
        startTime,
        endTime,
      };
    }
  }

  /**
   * Run concurrent batch of requests
   */
  private async runBatch(startId: number, count: number): Promise<RequestResult[]> {
    const promises = Array.from({ length: count }, (_, i) =>
      this.makeRequest(startId + i)
    );
    return Promise.all(promises);
  }

  /**
   * Run load test with controlled concurrency
   */
  async run(): Promise<void> {
    console.log('='.repeat(80));
    console.log('WORKOUT PARSER LOAD TEST');
    console.log('='.repeat(80));
    console.log();
    console.log('Configuration:');
    console.log(`  Total Requests:       ${this.config.total}`);
    console.log(`  Concurrent Requests:  ${this.config.concurrent}`);
    console.log(`  Ramp-up Time:         ${this.config.rampUpMs}ms`);
    console.log(`  Request Timeout:      ${this.config.timeoutMs}ms`);
    console.log();

    // Record start metrics
    this.metrics.startMemoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
    this.metrics.peakMemoryMB = this.metrics.startMemoryMB;
    this.metrics.testStartTime = Date.now();

    // Calculate batches
    const batches = Math.ceil(this.config.total / this.config.concurrent);
    const delayBetweenBatches = this.config.rampUpMs / batches;

    console.log(`Running ${batches} batch(es) with ${delayBetweenBatches.toFixed(0)}ms delay between batches...`);
    console.log();

    // Run batches
    for (let batch = 0; batch < batches; batch++) {
      const startId = batch * this.config.concurrent;
      const remainingRequests = this.config.total - startId;
      const batchSize = Math.min(this.config.concurrent, remainingRequests);

      console.log(`[Batch ${batch + 1}/${batches}] Starting ${batchSize} concurrent requests...`);

      const batchResults = await this.runBatch(startId, batchSize);
      this.metrics.results.push(...batchResults);

      // Update counts
      batchResults.forEach(result => {
        this.metrics.totalRequests++;
        if (result.status === 'success') {
          this.metrics.successCount++;
          this.metrics.responseTimes.push(result.durationMs);
        } else if (result.status === 'timeout') {
          this.metrics.timeoutCount++;
        } else {
          this.metrics.errorCount++;
        }

        if (result.errorType) {
          const count = this.metrics.errorsByType.get(result.errorType) || 0;
          this.metrics.errorsByType.set(result.errorType, count + 1);
        }
      });

      // Print batch summary
      const batchSuccesses = batchResults.filter(r => r.status === 'success').length;
      const batchErrors = batchResults.filter(r => r.status === 'error').length;
      const batchTimeouts = batchResults.filter(r => r.status === 'timeout').length;
      console.log(`[Batch ${batch + 1}/${batches}] Complete: ${batchSuccesses} success, ${batchErrors} errors, ${batchTimeouts} timeouts`);

      // Delay before next batch (except last batch)
      if (batch < batches - 1 && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    // Record end metrics
    this.metrics.testEndTime = Date.now();
    this.metrics.totalDurationMs = this.metrics.testEndTime - this.metrics.testStartTime;
    this.metrics.endMemoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Print detailed test report
   */
  printReport(): void {
    console.log();
    console.log('='.repeat(80));
    console.log('LOAD TEST RESULTS');
    console.log('='.repeat(80));
    console.log();

    // Overall Statistics
    console.log('Overall Statistics:');
    console.log('-'.repeat(80));
    console.log(`  Total Requests:       ${this.metrics.totalRequests}`);
    console.log(`  Successful:           ${this.metrics.successCount} (${((this.metrics.successCount / this.metrics.totalRequests) * 100).toFixed(1)}%)`);
    console.log(`  Failed:               ${this.metrics.errorCount} (${((this.metrics.errorCount / this.metrics.totalRequests) * 100).toFixed(1)}%)`);
    console.log(`  Timed Out:            ${this.metrics.timeoutCount} (${((this.metrics.timeoutCount / this.metrics.totalRequests) * 100).toFixed(1)}%)`);
    console.log(`  Total Duration:       ${(this.metrics.totalDurationMs / 1000).toFixed(2)}s`);
    console.log(`  Throughput:           ${(this.metrics.totalRequests / (this.metrics.totalDurationMs / 1000)).toFixed(2)} req/s`);
    console.log();

    // Response Time Statistics
    if (this.metrics.responseTimes.length > 0) {
      console.log('Response Time Statistics (Successful Requests):');
      console.log('-'.repeat(80));
      const avg = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
      const min = Math.min(...this.metrics.responseTimes);
      const max = Math.max(...this.metrics.responseTimes);
      const p50 = this.percentile(this.metrics.responseTimes, 50);
      const p95 = this.percentile(this.metrics.responseTimes, 95);
      const p99 = this.percentile(this.metrics.responseTimes, 99);

      console.log(`  Min:                  ${(min / 1000).toFixed(2)}s (${min.toFixed(0)}ms)`);
      console.log(`  Average:              ${(avg / 1000).toFixed(2)}s (${avg.toFixed(0)}ms)`);
      console.log(`  Median (p50):         ${(p50 / 1000).toFixed(2)}s (${p50.toFixed(0)}ms)`);
      console.log(`  p95:                  ${(p95 / 1000).toFixed(2)}s (${p95.toFixed(0)}ms)`);
      console.log(`  p99:                  ${(p99 / 1000).toFixed(2)}s (${p99.toFixed(0)}ms)`);
      console.log(`  Max:                  ${(max / 1000).toFixed(2)}s (${max.toFixed(0)}ms)`);
      console.log();
    }

    // Error Breakdown
    if (this.metrics.errorsByType.size > 0) {
      console.log('Error Breakdown:');
      console.log('-'.repeat(80));
      this.metrics.errorsByType.forEach((count, type) => {
        console.log(`  ${type.padEnd(20)}: ${count} (${((count / this.metrics.totalRequests) * 100).toFixed(1)}%)`);
      });
      console.log();
    }

    // Resource Usage
    console.log('Resource Usage:');
    console.log('-'.repeat(80));
    console.log(`  Start Memory:         ${this.metrics.startMemoryMB.toFixed(2)} MB`);
    console.log(`  Peak Memory:          ${this.metrics.peakMemoryMB.toFixed(2)} MB`);
    console.log(`  End Memory:           ${this.metrics.endMemoryMB.toFixed(2)} MB`);
    console.log(`  Memory Increase:      ${(this.metrics.endMemoryMB - this.metrics.startMemoryMB).toFixed(2)} MB`);
    console.log();

    // Sample Errors (first 5 unique errors)
    const uniqueErrors = new Map<string, { count: number; example: RequestResult }>();
    this.metrics.results
      .filter(r => r.status !== 'success')
      .forEach(result => {
        const key = `${result.errorType}: ${result.errorMessage}`;
        if (!uniqueErrors.has(key)) {
          uniqueErrors.set(key, { count: 1, example: result });
        } else {
          uniqueErrors.get(key)!.count++;
        }
      });

    if (uniqueErrors.size > 0) {
      console.log('Sample Errors (Top 5):');
      console.log('-'.repeat(80));
      Array.from(uniqueErrors.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .forEach(([error, info], index) => {
          console.log(`${index + 1}. ${error} (${info.count} occurrences)`);
          console.log(`   Request ID: ${info.example.requestId}`);
          console.log(`   Status Code: ${info.example.statusCode || 'N/A'}`);
          console.log();
        });
    }

    // Performance Assessment
    console.log('='.repeat(80));
    console.log('PERFORMANCE ASSESSMENT');
    console.log('='.repeat(80));
    console.log();

    const successRate = (this.metrics.successCount / this.metrics.totalRequests) * 100;
    const avgResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    if (successRate >= 95 && avgResponseTime < 60000) {
      console.log('✓ EXCELLENT: System handles load gracefully');
    } else if (successRate >= 80 && avgResponseTime < 90000) {
      console.log('⚠ ACCEPTABLE: System handles load but shows degradation');
    } else if (successRate >= 50) {
      console.log('✗ POOR: Significant failures under load');
    } else {
      console.log('✗✗ CRITICAL: System unable to handle load');
    }

    console.log();
    console.log('Observations:');
    if (successRate < 95) {
      console.log('  • High failure rate suggests resource constraints');
    }
    if (this.metrics.timeoutCount > 0) {
      console.log(`  • ${this.metrics.timeoutCount} requests exceeded ${this.config.timeoutMs / 1000}s timeout`);
    }
    if (this.metrics.errorsByType.has('network')) {
      console.log('  • Network errors suggest connection pool exhaustion');
    }
    if (avgResponseTime > 60000) {
      console.log('  • Slow average response time suggests bottlenecks');
    }
    const memoryIncrease = this.metrics.endMemoryMB - this.metrics.startMemoryMB;
    if (memoryIncrease > 500) {
      console.log(`  • High memory increase (${memoryIncrease.toFixed(0)}MB) suggests potential memory leaks`);
    }

    console.log();
    console.log('Recommendations:');
    if (successRate < 80 || avgResponseTime > 60000) {
      console.log('  1. Implement asynchronous processing with job queue (BullMQ)');
      console.log('  2. Add rate limiting to prevent API quota exhaustion');
      console.log('  3. Increase database connection pool size');
      console.log('  4. Consider horizontal scaling with worker processes');
    } else if (successRate < 95) {
      console.log('  1. Monitor API rate limits under production load');
      console.log('  2. Consider adding request queueing for bursts');
      console.log('  3. Implement caching for frequently accessed exercises');
    } else {
      console.log('  • System performing well at current concurrency level');
      console.log('  • Consider testing with higher concurrency to find limits');
    }

    console.log();
    console.log('='.repeat(80));
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const config = parseArgs();

  console.log('Initializing server...');
  const app = createApp(db);
  console.log('Server initialized ✓');
  console.log();

  const tester = new LoadTester(app, config);

  try {
    await tester.run();
    tester.printReport();
    process.exit(0);
  } catch (error) {
    console.error();
    console.error('Load test failed with error:');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    await db.destroy();
  }
}

// Run the test
main();
