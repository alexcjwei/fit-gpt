import { LLMService } from '../llm.service';
import { ExerciseSearchService } from '../exerciseSearch.service';
import { UnresolvedExercise } from '../../models/UnresolvedExercise';
import { WorkoutWithPlaceholders, WorkoutWithResolvedExercises } from './types';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI-Powered Exercise Resolver
 * Uses a hybrid approach:
 * 1. Try fuzzy search first (fast and cheap)
 * 2. Fall back to AI with tools if fuzzy search fails
 * 3. Track unresolved exercises in database for later review
 */
export class AiExerciseResolver {
  constructor(
    private searchService: ExerciseSearchService,
    private llmService: LLMService
  ) {}

  async resolve(
    workoutWithPlaceholders: WorkoutWithPlaceholders,
    userId?: string,
    workoutId?: string
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
              const exerciseId = await this.resolveExerciseName(
                exercise.exerciseName,
                userId,
                workoutId
              );

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
   * Resolve a single exercise name to a database ID
   * First tries fuzzy search with default threshold, only falls back to AI if nothing found
   */
  private async resolveExerciseName(
    exerciseName: string,
    userId?: string,
    workoutId?: string
  ): Promise<string> {
    // Step 1: Try fuzzy search using default threshold (0.8 - very lenient)
    const fuzzyResults = await this.searchService.searchByName(exerciseName);

    // If we found any matches, use the best one
    if (fuzzyResults.length > 0) {
      return fuzzyResults[0].exercise.id;
    }

    // Step 2: No fuzzy matches at all - fall back to AI
    const exerciseId = await this.resolveWithAI(exerciseName);

    // Step 3: Track this unresolved exercise for later review
    if (userId !== undefined && userId !== null) {
      await this.trackUnresolvedExercise(
        exerciseName,
        exerciseId,
        userId,
        workoutId
      );
    }

    return exerciseId;
  }

  /**
   * Use AI with tools to find the best matching exercise
   * Called only when fuzzy search found nothing
   */
  private async resolveWithAI(exerciseName: string): Promise<string> {
    const systemPrompt = `You are an expert fitness assistant helping to match exercise names to exercises in our database.

Your goal: Find the best matching exercise for the user's input.

Guidelines:
- The user input may include parenthetical modifiers like "(alternating)", "(each side)", "(single arm)" that aren't in our database names
- Consider these variations as likely matches to the base exercise name
- Search using different query strategies: name without parentheticals, equipment type, muscle groups, other similar exercises
- Once you find a good match, immediately call select_exercise with the exercise_id

Example search strategies:
- Input: "Reverse Lunges (alternating)" → Try searching: "reverse lunge", "lunge bodyweight", "unilateral leg exercise"
- Input: "DB Bench Press" → Try searching: "dumbbell bench", "dumbbell chest press"
- Input: "Hamstring Curls (lying)" → Try searching: "hamstring curl", "lying leg curl", "hamstring isolation"

You MUST find a match. It is likely you'll need to choose the closest alternative rather than an exact match.`;

    const userMessage = `Fuzzy search for "${exerciseName}" returned no results. Find the best matching exercise using creative search strategies.`;

    const tools: Anthropic.Tool[] = [
      {
        name: 'search_exercises',
        description:
          'Search for exercises in the database. Returns top matching exercises with their details. You can search by name, category, muscles, equipment, or tags.',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'The search query. Can be exercise name, muscle group (e.g., "hamstrings"), equipment (e.g., "dumbbell"), category (e.g., "legs"), or tags (e.g., "unilateral"). Try different variations if first search doesn\'t work.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'select_exercise',
        description:
          'Select an exercise as the final match. Call this once you have identified the best matching exercise from your search results.',
        input_schema: {
          type: 'object',
          properties: {
            exercise_id: {
              type: 'string',
              description: 'The ID of the exercise to select',
            },
            reasoning: {
              type: 'string',
              description:
                'Brief explanation of why this exercise is the best match',
            },
          },
          required: ['exercise_id', 'reasoning'],
        },
      },
    ];

    const toolHandler = async (toolName: string, toolInput: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (toolName === 'search_exercises') {
        const { query, limit = 10 } = toolInput as { query: string; limit?: number };
        const results = await this.searchService.searchByName(query, {
          limit,
          threshold: 0.8, // Very lenient for AI-guided search
        });

        return {
          results: results.map((r) => ({
            id: r.exercise.id,
            name: r.exercise.name,
            category: r.exercise.category,
            primaryMuscles: r.exercise.primaryMuscles,
            equipment: r.exercise.equipment,
            tags: r.exercise.tags,
            score: r.score,
          })),
          count: results.length,
        };
      }

      if (toolName === 'select_exercise') {
        const { exercise_id } = toolInput as { exercise_id: string };

        // Signal to stop the loop and return this exercise ID
        return {
          __stop: true,
          __value: exercise_id,
          success: true,
          selected_exercise_id: exercise_id,
        };
      }

      return { error: 'Unknown tool' };
    };

    try {
      const result = await this.llmService.callWithTools(
        systemPrompt,
        userMessage,
        tools,
        toolHandler,
        'haiku',
        { toolChoice: { type: 'any' } }
      );

      return result.content as string;
    } catch (error) {
      throw new Error(
        `No exercise found matching: "${exerciseName}". ${(error as Error).message}`
      );
    }
  }

  /**
   * Track an unresolved exercise in the database
   */
  private async trackUnresolvedExercise(
    originalName: string,
    resolvedExerciseId: string,
    userId: string,
    workoutId?: string
  ): Promise<void> {
    try {
      await UnresolvedExercise.create({
        originalName,
        resolvedExerciseId,
        userId,
        workoutId,
      });
    } catch (error) {
      // Don't fail the entire workout parsing if tracking fails
      console.error('Failed to track unresolved exercise:', error);
    }
  }
}
