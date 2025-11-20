import { randomUUID } from 'crypto';
import { WorkoutWithResolvedExercises, Workout } from '../../types';

/**
 * Database Formatter
 * Adds UUIDs to complete the Workout object
 * Note: exerciseId should already be resolved to database IDs before this stage
 */
export function createDatabaseFormatter() {
  async function format(resolvedWorkout: WorkoutWithResolvedExercises): Promise<Workout> {
    // Generate workout ID and add all UUIDs
    // exerciseIds are already resolved to database IDs by IDExtractor
    const workout: Workout = {
      ...resolvedWorkout,
      id: randomUUID(),
      blocks: resolvedWorkout.blocks.map((block) => ({
        ...block,
        id: randomUUID(),
        exercises: block.exercises.map((exercise) => ({
          ...exercise,
          id: randomUUID(),
          sets: exercise.sets.map((set) => ({
            ...set,
            id: randomUUID(),
          })),
        })),
      })),
    };

    return workout;
  }

  return { format };
}

export type DatabaseFormatter = ReturnType<typeof createDatabaseFormatter>;
