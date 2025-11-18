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
    const notFoundSlugs: string[] = [];
    await Promise.all(
      Array.from(slugsToConvert).map(async (slug) => {
        const exercise = await this.exerciseRepo.findBySlug(slug);
        if (exercise) {
          slugToIdMap[slug] = exercise.id;
        } else {
          // Track slugs that weren't found
          notFoundSlugs.push(slug);
        }
      })
    );

    // Throw error if any slugs weren't found - this indicates a bug in the pipeline
    if (notFoundSlugs.length > 0) {
      throw new Error(
        `DatabaseFormatter failed to convert slugs to IDs. ` +
        `The following slugs were not found in the database: ${notFoundSlugs.join(', ')}. ` +
        `This indicates that the IDExtractor or Parser produced invalid slugs.`
      );
    }

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
