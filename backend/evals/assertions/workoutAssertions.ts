import type { Workout } from '../../src/types/domain';

/**
 * Expected workout structure for test cases.
 * Uses structural counts and exercise slugs for stable comparison.
 */
export interface ExpectedWorkout {
  blockCount: number;
  blocks: ExpectedBlock[];
}

export interface ExpectedBlock {
  exerciseCount: number;
  exercises: ExpectedExercise[];
}

export interface ExpectedExercise {
  exerciseSlug: string;
  setCount: number;
}

/**
 * Result of a workout assertion.
 */
export interface WorkoutAssertionResult {
  pass: boolean;
  errors: string[];
}

/**
 * Asserts that a parsed workout matches the expected structure.
 *
 * Comparison strategy:
 * - Number of blocks
 * - Number of exercises per block
 * - Exercise slug for each exercise
 * - Number of sets per exercise
 *
 * This maintains simplicity while providing good correctness gauge.
 * Test cases should be designed such that each exercise has different counts.
 */
export function assertWorkoutStructure(
  actual: Workout,
  expected: ExpectedWorkout
): WorkoutAssertionResult {
  const errors: string[] = [];

  if (actual.blocks.length !== expected.blockCount) {
    errors.push(
      `Expected ${expected.blockCount} blocks, got ${actual.blocks.length}`
    );
    return { pass: false, errors };
  }
  for (let blockIdx = 0; blockIdx < actual.blocks.length; blockIdx++) {
    const actualBlock = actual.blocks[blockIdx];
    const expectedBlock = expected.blocks[blockIdx];

    if (actualBlock.exercises.length !== expectedBlock.exerciseCount) {
      errors.push(
        `Block ${blockIdx}: Expected ${expectedBlock.exerciseCount} exercises, got ${actualBlock.exercises.length}`
      );
      continue;
    }

    for (let exIdx = 0; exIdx < actualBlock.exercises.length; exIdx++) {
      const actualExercise = actualBlock.exercises[exIdx];
      const expectedExercise = expectedBlock.exercises[exIdx];

      if (actualExercise.exerciseSlug !== expectedExercise.exerciseSlug) {
        errors.push(
          `Block ${blockIdx}, Exercise ${exIdx}: Expected slug "${expectedExercise.exerciseSlug}", got "${actualExercise.exerciseSlug}"`
        );
      }

      if (actualExercise.sets.length !== expectedExercise.setCount) {
        errors.push(
          `Block ${blockIdx}, Exercise ${exIdx} (${actualExercise.exerciseSlug}): Expected ${expectedExercise.setCount} sets, got ${actualExercise.sets.length}`
        );
      }
    }
  }

  return {
    pass: errors.length === 0,
    errors,
  };
}
