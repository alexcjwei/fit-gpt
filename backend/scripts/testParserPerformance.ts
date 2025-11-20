/**
 * Performance test script for workout parser
 * Measures latency of each parsing stage
 */

import { db } from '../src/db';
import { LLMService } from '../src/services/llm.service';
import { createExerciseRepository } from '../src/repositories/ExerciseRepository';
import { createExerciseSearchService } from '../src/services/exerciseSearch.service';
import { createExerciseCreationService } from '../src/services/exerciseCreation.service';
import { createWorkoutValidator } from '../src/services/workoutParser/workoutValidator';
import { createIDExtractor } from '../src/services/workoutParser/idExtractor';
import { createParser } from '../src/services/workoutParser/parser';
import { createSyntaxFixer } from '../src/services/workoutParser/syntaxFixer';
import { createDatabaseFormatter } from '../src/services/workoutParser/databaseFormatter';
import { createEmbeddingService } from '../src/services/embedding.service';

// Sample workout text for testing
const SAMPLE_WORKOUT = `
Strength Training - November 15, 2024

1. Barbell Bench Press
   - 3x8 @ 185 lbs
   - Rest: 2 min

2. Barbell Squat
   - 5x5 @ 225 lbs
   - Focus on depth

3. Deadlift
   - 3x5 @ 275 lbs
   - RPE 8

4. Pull-ups
   - 4 sets to failure
`;

interface TimingResult {
  stage: string;
  duration: number;
  startTime: number;
  endTime: number;
}

async function testParserWithTimings() {
  console.log('='.repeat(80));
  console.log('WORKOUT PARSER PERFORMANCE TEST');
  console.log('='.repeat(80));
  console.log();
  console.log('Test Input:');
  console.log('-'.repeat(80));
  console.log(SAMPLE_WORKOUT);
  console.log('-'.repeat(80));
  console.log();

  const timings: TimingResult[] = [];
  const startOverall = performance.now();

  try {
    // Initialize services
    console.log('Initializing services...');
    const llmService = new LLMService();
    const exerciseRepository = createExerciseRepository(db);
    const embeddingService = createEmbeddingService();
    const searchService = createExerciseSearchService(exerciseRepository, embeddingService);
    const creationService = createExerciseCreationService(exerciseRepository, llmService);

    console.log('Services initialized ✓');
    console.log();

    // Stage 1: Pre-Validation
    console.log('STAGE 1: Pre-Validation');
    console.log('-'.repeat(80));
    let start = performance.now();
    const validator = createWorkoutValidator(llmService);
    const validationResult = await validator.validate(SAMPLE_WORKOUT);
    let end = performance.now();
    const validationTime = end - start;
    timings.push({ stage: 'Stage 1: Pre-Validation', duration: validationTime, startTime: start, endTime: end });

    console.log(`  Result: ${validationResult.isWorkout ? '✓' : '✗'} (confidence: ${validationResult.confidence.toFixed(2)})`);
    console.log(`  Reason: ${validationResult.reason}`);
    console.log(`  Duration: ${validationTime.toFixed(0)}ms (${(validationTime / 1000).toFixed(2)}s)`);
    console.log();

    if (!validationResult.isWorkout || validationResult.confidence < 0.7) {
      throw new Error('Validation failed');
    }

    // Stage 2: Exercise ID Extraction & Resolution
    console.log('STAGE 2: Exercise ID Extraction & Resolution');
    console.log('-'.repeat(80));
    start = performance.now();
    const idExtractor = createIDExtractor(llmService, searchService, creationService);
    const exerciseSlugMap = await idExtractor.extract(SAMPLE_WORKOUT);
    end = performance.now();
    const extractionTime = end - start;
    timings.push({ stage: 'Stage 2: ID Extraction', duration: extractionTime, startTime: start, endTime: end });

    console.log(`  Exercises found: ${Object.keys(exerciseSlugMap).length}`);
    Object.entries(exerciseSlugMap).forEach(([name, slug]) => {
      console.log(`    - "${name}" → ${slug}`);
    });
    console.log(`  Duration: ${extractionTime.toFixed(0)}ms (${(extractionTime / 1000).toFixed(2)}s)`);
    console.log();

    // Stage 3: Structured Parsing
    console.log('STAGE 3: Structured Parsing');
    console.log('-'.repeat(80));
    start = performance.now();
    const parser = createParser(llmService);
    const parsedWorkout = await parser.parse(SAMPLE_WORKOUT, exerciseSlugMap, {
      date: '2024-11-15',
      weightUnit: 'lbs',
    });
    end = performance.now();
    const parsingTime = end - start;
    timings.push({ stage: 'Stage 3: Structured Parsing', duration: parsingTime, startTime: start, endTime: end });

    console.log(`  Workout: ${parsedWorkout.name}`);
    console.log(`  Blocks: ${parsedWorkout.blocks.length}`);
    console.log(`  Total exercises: ${parsedWorkout.blocks.reduce((sum, b) => sum + b.exercises.length, 0)}`);
    console.log(`  Duration: ${parsingTime.toFixed(0)}ms (${(parsingTime / 1000).toFixed(2)}s)`);
    console.log();

    // Stage 4: Syntax Fixing
    console.log('STAGE 4: Syntax Validation & Fixing');
    console.log('-'.repeat(80));
    start = performance.now();
    const syntaxFixer = createSyntaxFixer(llmService);
    const syntacticallyFixedWorkout = await syntaxFixer.fix(SAMPLE_WORKOUT, parsedWorkout);
    end = performance.now();
    const syntaxTime = end - start;
    timings.push({ stage: 'Stage 5: Syntax Fixing', duration: syntaxTime, startTime: start, endTime: end });

    console.log(`  Syntax validation complete`);
    console.log(`  Duration: ${syntaxTime.toFixed(0)}ms (${(syntaxTime / 1000).toFixed(2)}s)`);
    console.log();

5   // Stage 6: Database Formatting
    console.log('STAGE 5: Database Formatting');
    console.log('-'.repeat(80));
    start = performance.now();
    const formatter = createDatabaseFormatter(exerciseRepository);
    const workout = await formatter.format(syntacticallyFixedWorkout);
    end = performance.now();
    const formattingTime = end - start;
    timings.push({ stage: 'Stage 5: Database Formatting', duration: formattingTime, startTime: start, endTime: end });

    console.log(`  UUIDs generated`);
    console.log(`  Slugs converted to IDs`);
    console.log(`  Duration: ${formattingTime.toFixed(0)}ms (${(formattingTime / 1000).toFixed(2)}s)`);
    console.log();

    const endOverall = performance.now();
    const totalTime = endOverall - startOverall;

    // Summary
    console.log('='.repeat(80));
    console.log('PERFORMANCE SUMMARY');
    console.log('='.repeat(80));
    console.log();

    // Print detailed breakdown
    timings.forEach((timing, index) => {
      const percentage = (timing.duration / totalTime) * 100;
      const bar = '█'.repeat(Math.round(percentage / 2));
      console.log(`${index + 1}. ${timing.stage}`);
      console.log(`   ${timing.duration.toFixed(0)}ms (${(timing.duration / 1000).toFixed(2)}s) - ${percentage.toFixed(1)}%`);
      console.log(`   ${bar}`);
      console.log();
    });

    console.log('-'.repeat(80));
    console.log(`TOTAL TIME: ${totalTime.toFixed(0)}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log('='.repeat(80));
    console.log();

    // Identify bottlenecks
    const sortedTimings = [...timings].sort((a, b) => b.duration - a.duration);
    console.log('BOTTLENECKS (Slowest stages):');
    console.log('-'.repeat(80));
    sortedTimings.slice(0, 3).forEach((timing, index) => {
      const percentage = (timing.duration / totalTime) * 100;
      console.log(`${index + 1}. ${timing.stage}: ${(timing.duration / 1000).toFixed(2)}s (${percentage.toFixed(1)}%)`);
    });
    console.log();

    // Final result
    console.log('FINAL WORKOUT:');
    console.log('-'.repeat(80));
    console.log(JSON.stringify(workout, null, 2));
    console.log('='.repeat(80));

  } catch (error) {
    console.error();
    console.error('ERROR:', error);
    console.error();
    throw error;
  } finally {
    // Clean up database connection
    await db.destroy();
  }
}

// Run the test
testParserWithTimings()
  .then(() => {
    console.log();
    console.log('Test completed successfully ✓');
    process.exit(0);
  })
  .catch((error) => {
    console.error();
    console.error('Test failed ✗');
    console.error(error);
    process.exit(1);
  });
