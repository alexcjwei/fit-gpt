import { LLMService } from '../llm.service';
import { ExerciseSearchService } from '../exerciseSearch.service';
import { ExerciseCreationService } from '../exerciseCreation.service';
import Anthropic from '@anthropic-ai/sdk';

export interface ExerciseIdMap {
  [exerciseName: string]: string; // Maps exercise name to exercise ID
}

/**
 * ID Extractor Module
 * Extracts exercise names from raw workout text and maps them to exercise IDs
 * Includes a validation loop to ensure all exercises are mapped
 */
export class IDExtractor {
  private readonly MAX_SEARCH_ATTEMPTS = 3;
  private readonly MAX_VALIDATION_ITERATIONS = 3;

  constructor(
    private llmService: LLMService,
    private searchService: ExerciseSearchService,
    private creationService?: ExerciseCreationService
  ) {
    this.creationService = creationService ?? new ExerciseCreationService(llmService);
  }

  /**
   * Extract exercise names from workout text and map them to exercise IDs
   * Uses a validation loop to ensure complete mapping
   */
  async extract(workoutText: string): Promise<ExerciseIdMap> {
    // Step 1: Extract exercise names from text
    const exerciseNames = await this.extractExerciseNames(workoutText);

    // Step 2: Map names to IDs in parallel
    const mappingPromises = exerciseNames.map(async (name) => {
      const exerciseId = await this.resolveExerciseName(name);
      return { name, exerciseId };
    });

    const mappings = await Promise.all(mappingPromises);
    let exerciseIdMap: ExerciseIdMap = {};
    mappings.forEach(({ name, exerciseId }) => {
      exerciseIdMap[name] = exerciseId;
    });

    // Step 3: Validation loop - ensure all exercises mentioned are mapped
    let iteration = 0;
    while (iteration < this.MAX_VALIDATION_ITERATIONS) {
      const unmappedExercises = await this.validateMapping(workoutText, exerciseIdMap);

      if (unmappedExercises.length === 0) {
        // All exercises mapped successfully
        break;
      }

      // Resolve unmapped exercises in parallel
      const unmappedPromises = unmappedExercises
        .filter((name) => !exerciseIdMap[name])
        .map(async (name) => {
          const exerciseId = await this.resolveExerciseName(name);
          return { name, exerciseId };
        });

      const unmappedMappings = await Promise.all(unmappedPromises);
      unmappedMappings.forEach(({ name, exerciseId }) => {
        exerciseIdMap[name] = exerciseId;
      });

      iteration++;
    }

    return exerciseIdMap;
  }

  /**
   * Extract exercise names from workout text using LLM
   */
  private async extractExerciseNames(workoutText: string): Promise<string[]> {
    const systemPrompt = `You are an expert fitness assistant that extracts exercise names from workout text.`;

    const userMessage = `Extract all exercise names mentioned in this workout text. Return them as a JSON array of strings.

<workout_text>
${workoutText}
</workout_text>

<instructions>
- Extract the exercise name as it appears in the text (e.g., "Bench Press", "DB Rows", "Squats")
- Include any equipment prefixes (e.g., "DB", "BB", "Barbell")
- Do NOT include rep/set information (e.g., "3x10")
- Do NOT include notes or modifiers in parentheses (e.g., "(alternating)")
- If an exercise is mentioned multiple times, include it only once
- Return format: {"exercises": ["Exercise 1", "Exercise 2", ...]}
</instructions>`;

    const response = await this.llmService.call<{ exercises: string[] }>(
      systemPrompt,
      userMessage,
      'haiku',
      { jsonMode: true }
    );

    return response.content.exercises || [];
  }

  /**
   * Validate that all exercises mentioned in the workout are mapped
   * Returns array of unmapped exercise names
   */
  private async validateMapping(
    workoutText: string,
    exerciseIdMap: ExerciseIdMap
  ): Promise<string[]> {
    const mappedExercises = Object.keys(exerciseIdMap);

    const systemPrompt = `You are an expert fitness assistant that validates workout parsing.`;

    const userMessage = `Check if all exercises mentioned in this workout are in the mapped list.

<workout_text>
${workoutText}
</workout_text>

<mapped_exercises>
${mappedExercises.join(', ')}
</mapped_exercises>

<instructions>
- Identify any exercises mentioned in the workout that are NOT in the mapped list
- Account for variations (e.g., "Squats" and "Back Squat" should be considered the same)
- Do NOT flag exercises that are adequately represented with minor naming differences
- Return format: {"unmapped": ["Exercise 1", "Exercise 2", ...]}
- If all exercises are mapped, return: {"unmapped": []}
</instructions>`;

    const response = await this.llmService.call<{ unmapped: string[] }>(
      systemPrompt,
      userMessage,
      'haiku',
      { jsonMode: true }
    );

    return response.content.unmapped || [];
  }

  /**
   * Resolve a single exercise name to a database ID
   * Uses hybrid approach: fuzzy search first, then AI fallback
   */
  private async resolveExerciseName(exerciseName: string): Promise<string> {
    // Step 1: Try fuzzy search with token-based ranking
    const fuzzyResults = await this.searchService.searchByName(exerciseName, { limit: 50 });
    const rankedResults = this.searchService.rankByToken(exerciseName, fuzzyResults);

    if (rankedResults.length > 0) {
      return rankedResults[0].exercise.id;
    }

    // Step 2: Fall back to AI
    const result = await this.resolveWithAI(exerciseName);
    return result.exerciseId;
  }

  /**
   * Use AI with tools to find the best matching exercise or create a new one
   */
  private async resolveWithAI(
    exerciseName: string
  ): Promise<{ exerciseId: string; wasCreated: boolean }> {
    const systemPrompt = `You are an expert fitness assistant helping to match exercise names to exercises in our database`;

    const userMessage = `Find a truly matching exercise OR create a new one if no good match exists using available tools.

A search for "${exerciseName}" returned no results. Either find a true match, or create a new exercise.

<instructions>
IMPORTANT Guidelines:
- ONLY select an existing exercise if it's truly the same exercise (not just similar)
- If the exercise doesn't exist in the database, create it instead of forcing a poor match
- You can search the database up to ${this.MAX_SEARCH_ATTEMPTS} time(s)
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
        description: `Search for exercises in the database. You can call this up to ${this.MAX_SEARCH_ATTEMPTS} time(s).`,
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
        if (searchCount >= this.MAX_SEARCH_ATTEMPTS) {
          throw new Error(`Maximum search attempts reached. Please select or create an exercise.`);
        }
        searchCount++;

        const { query, limit = 10 } = toolInput as { query: string; limit?: number };
        const results = await this.searchService.searchByName(query, {
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
        return {
          __stop: true,
          __value: { exerciseId: exercise_id, wasCreated: false },
          success: true,
          selected_exercise_id: exercise_id,
        };
      }

      if (toolName === 'create_exercise') {
        const { exercise_name } = toolInput as { exercise_name: string };
        const newExercise = await this.creationService!.createPlainExercise(exercise_name);
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
      const result = await this.llmService.callWithTools(
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
}
