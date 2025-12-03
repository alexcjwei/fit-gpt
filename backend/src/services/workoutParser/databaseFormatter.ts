import { randomUUID } from 'crypto';
import { WorkoutWithResolvedExercises, Workout } from '../../types';
import type { ExerciseRepository } from '../../repositories/ExerciseRepository';

/**
 * Database Formatter
 * Adds UUIDs and fetches exerciseSlug to complete the Workout object
 * Note: exerciseId should already be resolved to database IDs before this stage
 */
export function createDatabaseFormatter(exerciseRepository: ExerciseRepository) {
  async function format(resolvedWorkout: WorkoutWithResolvedExercises): Promise<Workout> {
    // Generate workout ID and add all UUIDs
    // exerciseIds are already resolved to database IDs by IDExtractor
    const workout: Workout = {
      ...resolvedWorkout,
      id: randomUUID(),
      blocks: await Promise.all(
        resolvedWorkout.blocks.map(async (block) => ({
          ...block,
          id: randomUUID(),
          exercises: await Promise.all(
            block.exercises.map(async (exercise) => {
              // Fetch exercise to get slug
              const exerciseData = await exerciseRepository.findById(exercise.exerciseId);
              if (!exerciseData) {
                throw new Error(`Exercise not found: ${exercise.exerciseId}`);
              }

              return {
                ...exercise,
                id: randomUUID(),
                exerciseSlug: exerciseData.slug,
                sets: exercise.sets.map((set) => ({
                  ...set,
                  id: randomUUID(),
                })),
              };
            })
          ),
        }))
      ),
    };

    return workout;
  }

  return { format };
}

export type DatabaseFormatter = ReturnType<typeof createDatabaseFormatter>;
