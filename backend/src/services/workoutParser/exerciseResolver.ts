import { ExerciseSearchService } from '../exerciseSearch.service';
import { WorkoutWithPlaceholders, WorkoutWithResolvedExercises } from '../../types';

/**
 * Stage 2: Exercise Resolver
 * Replace exerciseName placeholders with actual database IDs (exerciseId)
 * Uses fuzzy search to find the best matching exercise
 */
export class ExerciseResolver {
  constructor(private searchService: ExerciseSearchService) {}

  async resolve(
    workoutWithPlaceholders: WorkoutWithPlaceholders
  ): Promise<WorkoutWithResolvedExercises> {
    // Build the resolved workout by mapping over blocks and exercises
    const resolvedWorkout: WorkoutWithResolvedExercises = {
      ...workoutWithPlaceholders,
      blocks: await Promise.all(
        workoutWithPlaceholders.blocks.map(async (block) => ({
          ...block,
          exercises: await Promise.all(
            block.exercises.map(async (exercise) => {
              // Resolve the exerciseName to an actual ID
              const exerciseId = await this.resolveExerciseName(exercise.exerciseName);

              // Return the exercise with exerciseId instead of exerciseName
              const { exerciseName: _exerciseName, ...rest } = exercise;
              return {
                ...rest,
                exerciseId,
              };
            })
          ),
        }))
      ),
    };

    return resolvedWorkout;
  }

  /**
   * Resolve a single exercise name to a database ID using fuzzy search
   * Returns the best match (lowest score) from the search results
   */
  private async resolveExerciseName(exerciseName: string): Promise<string> {
    const results = await this.searchService.searchByName(exerciseName, {
      limit: 1,
      threshold: 0.6, // More lenient threshold for workout parsing
    });

    if (results.length === 0) {
      throw new Error(`No exercise found matching: "${exerciseName}"`);
    }

    // Return the ID of the best match (first result, lowest score)
    return results[0].exercise.id;
  }
}
