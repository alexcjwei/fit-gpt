import { LLMService } from '../llm.service';
import type { ExerciseSearchService } from '../exerciseSearch.service';
import type { ExerciseCreationService } from '../exerciseCreation.service';
import type { ExerciseRepository } from '../../repositories/ExerciseRepository';
import type { WorkoutWithPlaceholders, WorkoutWithResolvedExercises } from '../../types';

export interface ExerciseSlugMap {
  [exerciseName: string]: string; // Maps exercise name to exercise slug
}

interface AIExerciseResponse {
  name: string;
  slug: string;
  reason: string;
  confidence: number;
}

/**
 * ID Extractor Module
 * Takes a parsed workout with exerciseNames and resolves them to exerciseIds (database IDs)
 */
export function createIDExtractor(
  llmService: LLMService,
  searchService: ExerciseSearchService,
  creationService: ExerciseCreationService,
  exerciseRepository: ExerciseRepository
) {

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
   * Use AI with trigram search results to find the best matching exercise or create a new one
   */
  async function resolveWithAI(
    exerciseName: string
  ): Promise<{ exerciseId: string; wasCreated: boolean }> {
    // Step 1: Perform trigram search
    const trigramResults = await exerciseRepository.searchByTrigram(exerciseName, 10);

    // Step 2: If no trigram results, skip AI and create exercise directly
    if (trigramResults.length === 0) {
      console.log(
        `[IDExtractor] No trigram results for "${exerciseName}", creating exercise directly`
      );
      const newExercise = await creationService.createPlainExercise(exerciseName);
      return { exerciseId: newExercise.id, wasCreated: true };
    }

    // Step 3: Format trigram results as "Exercise Name: exercise-slug" pairs
    const searchResults = trigramResults
      .map((result) => `${result.exercise.name}: ${result.exercise.slug}`)
      .join('\n');

    console.log(`[IDExtractor] Trigram search results for "${exerciseName}":\n${searchResults}`);

    // Step 4: Ask AI to select best match or suggest creating new exercise
    const systemPrompt = `You are an AI assistant tasked with matching an exercise name to a database slug\n`;

    const userMessage = `Choose the entry with the closest meaning to the query.

The following "Exercise Name: exercise-slug" pairs are the result of a Postgres trigram search:
<search_results>
${searchResults}
</search_results>

<instructions>
- Select the closest matching exercise if they have the same movement, purpose, or meaning.
  - (IMPORTANT) In this case, the slug must match that from the search results.
- If none of the search results match with the query, return new information to create the database entry instead of selecting a poor match
</instructions>

<examples>
Example of selecting an exercise from the search results:

<search_results>
...
Reverse Lunges (alternating): reverse-lunges-alternating
Side Lunges: side-lunges
Walking lunges (alternating): walking-lunges-alternating
...
</search_results>

Query: Reverse Lunges

<output>
{
    "name": "Reverse Lunges (alternating)",
    "slug": "reverse-lunges-alternating",
    "reason": "Reverse Lunges and Reverse Lunges (alternating) are technically the same exercise",
    "confidence": 1
}
</output>

Another matching example:
<search_results>
...
Walk: walk
Crab walk: crab-walk
...
</search_results>

Query: Brisk Walk

<output>
{
    "name": "Walk",
    "slug": "walk",
    "reason": "Walk and Brisk Walk are the same movement with different intensities.",
    "confidence": 1
}
</output>

"Brisk" is a descriptor of the movement or exercise "Walk".
You should use an existing exercise of same movement rather than create a new one.

Here's an example of creating an exercise when no good match is in the search results:
<search_results>
Foam roll glutes: foam-roll-glutes
Foam roll IT band: foam-roll-it-band
Foam roll quads: foam-roll-quads
</search_results>

Query: Foam roll hips

<output>
{
    "name": "Foam roll hips",
    "slug": "foam-roll-hips",
    "reason": "No existing exercise to foam roll hips. Hips includes glutes but usually other areas too.",
    "confidence": 0.95
}
</output>

When this result is processed, it will create a new exercise with that name and slug.
</examples>

<format_instructions>
Return the following JSON object:
{
    "name": <exercise_name>,
    "slug": <exercise_slug>,
    "reason": <short explanation for why selection was made or new entry was created>,
    "confidence": <0-1>
}
</format_instructions>

Query: ${exerciseName}
`;

    try {
      const result = await llmService.call<AIExerciseResponse>(
        systemPrompt,
        userMessage,
        'haiku',
        { jsonMode: true }
      );

      const aiResponse = result.content;
      console.log(
        `[IDExtractor] AI response for "${exerciseName}": ${JSON.stringify(aiResponse)}`
      );

      // Step 5: Check if the suggested slug exists in the database
      const existingExercise = await exerciseRepository.findBySlug(aiResponse.slug);

      if (existingExercise) {
        // Use existing exercise
        console.log(
          `[IDExtractor] Using existing exercise "${existingExercise.name}" (${existingExercise.slug})`
        );
        return { exerciseId: existingExercise.id, wasCreated: false };
      } else {
        // Create new exercise with AI-suggested name and slug
        console.log(
          `[IDExtractor] Creating new exercise "${aiResponse.name}" (${aiResponse.slug})`
        );
        const newExercise = await creationService.createPlainExercise(aiResponse.name);
        return { exerciseId: newExercise.id, wasCreated: true };
      }
    } catch (error) {
      throw new Error(`Failed to resolve exercise: "${exerciseName}". ${(error as Error).message}`);
    }
  }

  return {
    resolveIds,
  };
}

export type IDExtractor = ReturnType<typeof createIDExtractor>;
