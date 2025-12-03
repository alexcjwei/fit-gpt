import { LLMService } from '../llm.service';
import type { ExerciseSearchService } from '../exerciseSearch.service';
import type { ExerciseCreationService } from '../exerciseCreation.service';
import type { ExerciseRepository } from '../../repositories/ExerciseRepository';
import type { WorkoutWithPlaceholders, WorkoutWithResolvedExercises } from '../../types';
import { normalizeForSlug } from '../../utils/stringNormalization';

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
   * Deduplicates exercise names based on normalized slug (first name encountered is used)
   */
  async function resolveIds(workout: WorkoutWithPlaceholders): Promise<WorkoutWithResolvedExercises> {
    // Step 1: Extract unique exercise names and deduplicate by normalized slug
    // Build map: slug -> first exercise name encountered
    const slugToFirstName = new Map<string, string>();
    const allExerciseNames: string[] = [];

    workout.blocks.forEach((block) => {
      block.exercises.forEach((exercise) => {
        const name = exercise.exerciseName;
        const slug = normalizeForSlug(name);

        // Track all names (including duplicates)
        allExerciseNames.push(name);

        // Only keep first name for each slug
        if (!slugToFirstName.has(slug)) {
          slugToFirstName.set(slug, name);
        }
      });
    });

    // Step 2: Resolve only canonical (first) exercise names to IDs in parallel
    const canonicalNames = Array.from(slugToFirstName.values());
    const slugToIdMap = new Map<string, string>();

    const resolutionResults = await Promise.all(
      canonicalNames.map(async (name) => {
        const slug = normalizeForSlug(name);
        const exerciseId = await resolveExerciseName(name);
        return { slug, exerciseId };
      })
    );

    // Collect results
    resolutionResults.forEach(({ slug, exerciseId }) => {
      slugToIdMap.set(slug, exerciseId);
    });

    // Step 3: Build name -> ID map for ALL names (including variations)
    const nameToIdMap: Record<string, string> = {};
    allExerciseNames.forEach((name) => {
      const slug = normalizeForSlug(name);
      const exerciseId = slugToIdMap.get(slug);
      if (exerciseId) {
        nameToIdMap[name] = exerciseId;
      }
    });

    // Step 4: Transform workout to have exerciseIds instead of exerciseNames
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
    return await resolveWithAI(exerciseName);
  }

  /**
   * Use AI with trigram search results to find the best matching exercise or create a new one
   */
  async function resolveWithAI(
    exerciseName: string
  ): Promise<string> {
    // Step 1: Perform trigram search
    const trigramResults = await exerciseRepository.searchByTrigram(exerciseName, 10);

    // Step 2: If no trigram results, skip AI and create exercise directly
    if (trigramResults.length === 0) {
      console.log(
        `[IDExtractor] No trigram results for "${exerciseName}", creating exercise directly`
      );
      const newExercise = await creationService.getOrCreateExerciseByName(exerciseName);
      return newExercise.id;
    }

    // Step 3: Format trigram results as "Exercise Name: exercise-slug" pairs
    const searchResults = trigramResults
      .map((result) => `${result.exercise.name}: ${result.exercise.slug}`)
      .join('\n');

    console.log(`[IDExtractor] Trigram search results for "${exerciseName}":\n${searchResults}`);

    // Step 4: Ask AI to select best match or suggest creating new exercise
    const systemPrompt = `You are an AI assistant tasked with matching an exercise name to a database slug\n`;

    const userMessage = `Choose the entry whose movement best matches the query.

<search_results>
${searchResults}
</search_results>

<instructions>
- Only pick an item if it represents the same movement as the query.
- Close variants are fine (e.g., “Bench Press” → “Barbell Bench Press”).
- Use the slug exactly as shown.
- If nothing in search_results matches the movement, create a new exercise using a canonical name and slug (not necessarily the query verbatim).
</instructions>

<examples>
Selecting from results:
Reverse Lunges → Reverse Lunges (alternating): reverse-lunges-alternating

Brisk Walk → Walk: walk
(“Brisk” is just an intensity descriptor.)

Creating new:
Foam roll hips → create “Foam roll hips”: foam-roll-hips  
(Maybe "Foam roll hamstrings" and "Foam roll calf" are in search_results; in this case create a new "Foam roll hips")
</examples>

<format_instructions>
Return:
{
  "name": <exercise_name>,
  "slug": <exercise_slug>,
  "reason": <brief explanation>,
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
        return existingExercise.id;
      } else {
        // Create new exercise with AI-suggested name and slug
        console.log(
          `[IDExtractor] Creating new exercise "${aiResponse.name}" (${aiResponse.slug})`
        );
        const newExercise = await creationService.getOrCreateExerciseByName(aiResponse.name);
        return newExercise.id;
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
