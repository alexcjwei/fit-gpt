import { randomUUID } from 'crypto';
import { WorkoutWithResolvedExercises } from './types';
import { Workout } from '../../types';

/**
 * Stage 3: Database Formatter
 * Add final missing fields (UUIDs) to complete the Workout object
 */
export class DatabaseFormatter {
  format(resolvedWorkout: WorkoutWithResolvedExercises): Workout {
    // Generate workout ID and add all UUIDs
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
}
