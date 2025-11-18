import { randomUUID } from 'crypto';
import { WorkoutWithResolvedExercises } from './types';
import { Workout } from '../../types';
import { ExerciseRepository } from '../../repositories/ExerciseRepository';
import { db } from '../../db';

/**
 * Stage 3: Database Formatter
 * Converts exercise slugs to IDs and adds UUIDs to complete the Workout object
 */
export class DatabaseFormatter {
  private exerciseRepo: ExerciseRepository;

  constructor(exerciseRepo?: ExerciseRepository) {
    this.exerciseRepo = exerciseRepo ?? new ExerciseRepository(db);
  }

  async format(resolvedWorkout: WorkoutWithResolvedExercises): Promise<Workout> {
    // Convert all exercise slugs to IDs
    const slugsToConvert = new Set<string>();
    resolvedWorkout.blocks.forEach((block) => {
      block.exercises.forEach((exercise) => {
        slugsToConvert.add(exercise.exerciseId); // exerciseId contains slug at this stage
      });
    });

    // Batch query all slugs
    const slugToIdMap: Record<string, string> = {};
    await Promise.all(
      Array.from(slugsToConvert).map(async (slug) => {
        const exercise = await this.exerciseRepo.findBySlug(slug);
        if (exercise) {
          slugToIdMap[slug] = exercise.id;
        } else {
          // If slug not found, keep the slug as-is (shouldn't happen in normal flow)
          slugToIdMap[slug] = slug;
        }
      })
    );

    // Generate workout ID, convert slugs to IDs, and add all UUIDs
    const workout: Workout = {
      ...resolvedWorkout,
      id: randomUUID(),
      blocks: resolvedWorkout.blocks.map((block) => ({
        ...block,
        id: randomUUID(),
        exercises: block.exercises.map((exercise) => ({
          ...exercise,
          id: randomUUID(),
          exerciseId: slugToIdMap[exercise.exerciseId] || exercise.exerciseId, // Convert slug to ID
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
