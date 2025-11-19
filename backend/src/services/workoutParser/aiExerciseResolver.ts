import { LLMService } from '../llm.service';
import type { ExerciseSearchService } from '../exerciseSearch.service';
import type { ExerciseCreationService } from '../exerciseCreation.service';
import { WorkoutWithPlaceholders, WorkoutWithResolvedExercises } from '../../types';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI-Powered Exercise Resolver
 * Uses a hybrid approach:
 * 1. Try fuzzy search first (fast and cheap)
 * 2. Fall back to AI with tools if fuzzy search fails
 * 3. AI can either select existing exercise or create a new one
 */
export function createAiExerciseResolver(
  searchService: ExerciseSearchService,
  llmService: LLMService,
  creationService: ExerciseCreationService
) {
  const MAX_SEARCH_ATTEMPTS = 3;

  async function resolve(
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
              const exerciseId = await resolveExerciseName(
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
  async function resolveExerciseName(
    exerciseName: string,
    _userId?: string,
    _workoutId?: string
  ): Promise<string> {
    // Step 1: Cast a wider search net (limit: 50) and re-rank using token-based scoring
    // This helps "Bench Press" match "Barbell Bench Press" over "Close-Grip Barbell Bench Press"
    const fuzzyResults = await searchService.searchByName(exerciseName, { limit: 50 });

    // Re-rank results using token-based scoring for better matching
    const rankedResults = searchService.rankByToken(exerciseName, fuzzyResults);

    // If we found any matches, use the best one
    if (rankedResults.length > 0) {
      return rankedResults[0].exercise.id;
    }

    // Step 2: No fuzzy matches at all - fall back to AI
    const result = await resolveWithAI(exerciseName);

    return result.exerciseId;
  }

  /**
   * Use AI with tools to find the best matching exercise or create a new one
   * Called only when fuzzy search found nothing
   */
  async function resolveWithAI(
    exerciseName: string
  ): Promise<{ exerciseId: string; wasCreated: boolean }> {
    const systemPrompt = `You are an expert fitness assistant helping to match exercise names to exercises in our database`;
    const userMessage = `Find a truly matching exercise OR create a new one if no good match exists using available tools.

A search for "${exerciseName}" returned no results. Either find a true match, or create a new exercise.

<instructions>
IMPORTANT Guidelines:
- ONLY select an existing exercise if it's truly the same exercise (not just similar)
- If the exercise the user mentioned doesn't exist in the database, create it instead of forcing a poor match
- You can search the database up to ${MAX_SEARCH_ATTEMPTS} time(s)
- The user input may include parenthetical modifiers like "(alternating)", "(each side)", "(single arm)" that aren't in our database names - these are still the same exercise
- Once you find a TRUE match, call select_exercise. If you can't find a true match after searching, call create_exercise

Example decision making:
- Input: "Reverse Lunges (alternating)" + Found: "Reverse Lunges" → SELECT (same exercise, modifier is just clarification)
- Input: "Landmine Press" + Found: "Barbell Bench Press" → CREATE (different exercises, don't force a match)
- Input: "DB Bench Press" + Found: "Dumbbell Bench Press" → SELECT (same exercise, DB is abbreviation)
- Input: "Cable Tricep Pushdown" + Found: "Tricep Rope Pushdown" → Could go either way, but CREATE is safer if not confident
- Input: "Single leg RDL" + Search for "Single leg" returns ["Single Leg Butt Kick", "Single Leg Glute Bridge", "Single Leg Push-off"] → CREATE (broader search resulted in no good match)

Search strategies:
- Strip parentheticals: "Reverse Lunges (alternating)" → "reverse lunge"
- Expand abbreviations: "DB" → "dumbbell", "BB" → "barbell"
- Search uses Postgres full-text search
</instructions>`;

    const tools: Anthropic.Tool[] = [
      {
        name: 'search_exercises',
        description:
          'Search for exercises in the database by name or tags. Searches across exercise names and their associated tags (which may include muscles, equipment, movement patterns, etc.). You can call this up to ' +
          MAX_SEARCH_ATTEMPTS +
          ' time(s).',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'The search query. Searches exercise names and tags. Tags may include muscle groups (e.g., "hamstrings"), equipment (e.g., "dumbbell"), movement patterns (e.g., "push"), or other descriptors (e.g., "unilateral").',
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
          'Select an existing exercise as the final match. ONLY call this if you found a TRUE match (not just similar). If uncertain, create instead.',
        input_schema: {
          type: 'object',
          properties: {
            exercise_id: {
              type: 'string',
              description: 'The ID of the exercise to select',
            },
            reasoning: {
              type: 'string',
              description: 'Brief explanation of why this exercise is truly the same',
            },
          },
          required: ['exercise_id', 'reasoning'],
        },
      },
      {
        name: 'create_exercise',
        description:
          'Create a new exercise in the database. Call this when you cannot find a TRUE match in the database. The exercise will be flagged for admin review.',
        input_schema: {
          type: 'object',
          properties: {
            exercise_name: {
              type: 'string',
              description:
                'The name of the exercise to create (use the original user input or cleaned up version)',
            },
          },
          required: ['exercise_name'],
        },
      },
    ];

    let searchCount = 0;

    const toolHandler = async (
      toolName: string,
      toolInput: Record<string, unknown>
    ): Promise<Record<string, unknown>> => {
      if (toolName === 'search_exercises') {
        // Enforce search limit
        if (searchCount >= MAX_SEARCH_ATTEMPTS) {
          throw new Error(
            `Maximum search attempts (${MAX_SEARCH_ATTEMPTS}) reached. Please either select an exercise or create a new one.`
          );
        }
        searchCount++;

        const { query, limit = 10 } = toolInput as { query: string; limit?: number };
        const results = await searchService.searchByName(query, {
          limit,
          threshold: 0.8, // Very lenient for AI-guided search
        });

        return {
          results: results.map((r) => ({
            id: r.exercise.id,
            name: r.exercise.name,
            slug: r.exercise.slug,
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
          __value: { exerciseId: exercise_id, wasCreated: false },
          success: true,
          selected_exercise_id: exercise_id,
        };
      }

      if (toolName === 'create_exercise') {
        const { exercise_name } = toolInput as { exercise_name: string };

        // Create the new exercise
        const newExercise = await creationService.createPlainExercise(exercise_name);

        // Signal to stop the loop and return the new exercise ID
        return {
          __stop: true,
          __value: { exerciseId: newExercise.id, wasCreated: true },
          success: true,
          created_exercise_id: newExercise.id,
        };
      }

      return { error: 'Unknown tool' };
    };

    try {
      const result = await llmService.callWithTools(
        systemPrompt,
        userMessage,
        tools,
        toolHandler,
        'haiku',
        { toolChoice: { type: 'any' } }
      );

      return result.content as { exerciseId: string; wasCreated: boolean };
    } catch (error) {
      throw new Error(`Failed to resolve exercise: "${exerciseName}". ${(error as Error).message}`);
    }
  }

  return {
    resolve,
  };
}

export type AiExerciseResolver = ReturnType<typeof createAiExerciseResolver>;
