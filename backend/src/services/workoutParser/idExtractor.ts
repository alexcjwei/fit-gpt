import { LLMService } from '../llm.service';
import type { ExerciseSearchService } from '../exerciseSearch.service';
import type { ExerciseCreationService } from '../exerciseCreation.service';
import type { WorkoutWithPlaceholders, WorkoutWithResolvedExercises } from '../../types';
import Anthropic from '@anthropic-ai/sdk';

export interface ExerciseSlugMap {
  [exerciseName: string]: string; // Maps exercise name to exercise slug
}

/**
 * ID Extractor Module
 * Takes a parsed workout with exerciseNames and resolves them to exerciseIds (database IDs)
 */
export function createIDExtractor(
  llmService: LLMService,
  searchService: ExerciseSearchService,
  creationService: ExerciseCreationService
) {
  const MAX_SEARCH_ATTEMPTS = 3;

  /**
   * Resolve exercise names in a parsed workout to exercise IDs
   */
  async function resolveIds(workout: WorkoutWithPlaceholders): Promise<WorkoutWithResolvedExercises> {
    // Step 1: Extract unique exercise names from the workout
    const exerciseNames = new Set<string>();
    workout.blocks.forEach((block) => {
      block.exercises.forEach((exercise) => {
        exerciseNames.add(exercise.exerciseName);
      });
    });

    // Step 2: Map all exercise names to IDs in parallel
    const nameToIdMap: Record<string, string> = {};
    await Promise.all(
      Array.from(exerciseNames).map(async (name) => {
        const exerciseId = await resolveExerciseName(name);
        nameToIdMap[name] = exerciseId;
      })
    );

    // Step 3: Transform workout to have exerciseIds instead of exerciseNames
    const resolvedWorkout: WorkoutWithResolvedExercises = {
      ...workout,
      blocks: workout.blocks.map((block) => ({
        ...block,
        exercises: block.exercises.map((exercise) => ({
          exerciseId: nameToIdMap[exercise.exerciseName],
          orderInBlock: exercise.orderInBlock,
          prescription: exercise.prescription,
          notes: exercise.notes,
          sets: exercise.sets,
        })),
      })),
    };

    return resolvedWorkout;
  }

  /**
   * Resolve a single exercise name to a database ID
   * Uses hybrid approach: semantic search first (with threshold), then AI fallback
   */
  async function resolveExerciseName(exerciseName: string): Promise<string> {
    // Step 1: Try semantic search with similarity threshold
    // Threshold of 0.75 means we need high confidence that this is the right exercise
    const SIMILARITY_THRESHOLD = 0.75;

    try {
      const semanticResults = await searchService.searchBySemantic(exerciseName, {
        limit: 1,
        threshold: SIMILARITY_THRESHOLD,
      });

      if (semanticResults.length > 0) {
        const topResult = semanticResults[0];
        console.log(
          `[IDExtractor] Semantic match: "${exerciseName}" → "${topResult.exercise.name}" (similarity: ${topResult.similarity.toFixed(3)})`
        );
        return topResult.exercise.id;
      }

      console.log(
        `[IDExtractor] No semantic match above threshold (${SIMILARITY_THRESHOLD}) for "${exerciseName}"`
      );
    } catch (error) {
      // If semantic search fails (e.g., embeddings not available), fall through to AI
      console.log(`[IDExtractor] Semantic search failed for "${exerciseName}":`, error);
    }

    // Step 2: Fall back to AI when similarity is too low
    console.log(`[IDExtractor] Using AI fallback for "${exerciseName}"`);
    const result = await resolveWithAI(exerciseName);
    return result.exerciseId;
  }

  /**
   * Use AI with tools to find the best matching exercise or create a new one
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
- If the exercise doesn't exist in the database, create it instead of forcing a poor match
- You can search the database up to ${MAX_SEARCH_ATTEMPTS} time(s)
- Parenthetical modifiers like "(alternating)", "(each side)" aren't in our database names - these are still the same exercise
- Once you find a TRUE match, call select_exercise. If you can't find a true match, call create_exercise

Example decision making:
- Input: "Reverse Lunges (alternating)" + Found: "Reverse Lunges" → SELECT (same exercise)
- Input: "Landmine Press" + Found: "Barbell Bench Press" → CREATE (different exercises)
- Input: "DB Bench Press" + Found: "Dumbbell Bench Press" → SELECT (DB is abbreviation)

Search strategies:
- Strip parentheticals: "Reverse Lunges (alternating)" → "reverse lunge"
- Expand abbreviations: "DB" → "dumbbell", "BB" → "barbell"
</instructions>`;

    const tools: Anthropic.Tool[] = [
      {
        name: 'search_exercises',
        description: `Search for exercises in the database. You can call this up to ${MAX_SEARCH_ATTEMPTS} time(s).`,
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query for exercise names',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'select_exercise',
        description: 'Select an existing exercise as the final match. ONLY if truly the same.',
        input_schema: {
          type: 'object',
          properties: {
            exercise_id: {
              type: 'string',
              description: 'The ID of the exercise to select',
            },
            reasoning: {
              type: 'string',
              description: 'Why this exercise is truly the same',
            },
          },
          required: ['exercise_id', 'reasoning'],
        },
      },
      {
        name: 'create_exercise',
        description: 'Create a new exercise in the database when no TRUE match exists.',
        input_schema: {
          type: 'object',
          properties: {
            exercise_name: {
              type: 'string',
              description: 'The name of the exercise to create',
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
        if (searchCount >= MAX_SEARCH_ATTEMPTS) {
          throw new Error(`Maximum search attempts reached. Please select or create an exercise.`);
        }
        searchCount++;

        const { query, limit = 10 } = toolInput as { query: string; limit?: number };
        const results = await searchService.searchByName(query, {
          limit,
          threshold: 0.8,
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
        // Verify the exercise exists
        const results = await searchService.searchByName('', { limit: 1000 });
        const exercise = results.find(r => r.exercise.id === exercise_id);
        if (!exercise) {
          throw new Error(`Exercise with ID ${exercise_id} not found`);
        }
        return {
          __stop: true,
          __value: { exerciseId: exercise.exercise.id, wasCreated: false },
          success: true,
          selected_exercise_id: exercise.exercise.id,
        };
      }

      if (toolName === 'create_exercise') {
        const { exercise_name } = toolInput as { exercise_name: string };
        const newExercise = await creationService.createPlainExercise(exercise_name);
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
    resolveIds,
  };
}

export type IDExtractor = ReturnType<typeof createIDExtractor>;
