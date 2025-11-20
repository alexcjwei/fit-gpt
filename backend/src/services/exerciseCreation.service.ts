import type { ExerciseRepository } from '../repositories/ExerciseRepository';
import { Exercise as ExerciseType } from '../types';
import { LLMService } from './llm.service';
import { createEmbeddingService, type EmbeddingService } from './embedding.service';

interface ExerciseMetadata {
  slug: string;
  name: string;
  tags: string[];
}

/**
 * Service for creating new exercises using LLM
 * Used when workout parser cannot find a matching exercise in the database
 * Automatically generates embeddings for semantic search
 */
export function createExerciseCreationService(
  exerciseRepository: ExerciseRepository,
  llmService: LLMService = new LLMService(),
  embeddingService: EmbeddingService = createEmbeddingService()
) {
  /**
   * Create a plain new exercise
   * Sets needsReview: true to indicate this needs admin review
   * Automatically generates embedding for semantic search
   */
  async function createPlainExercise(exerciseName: string): Promise<ExerciseType> {
    // Build slug from exercise name
    const slug = exerciseName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z-]/g, '');

    if (slug.length === 0 || !/[a-z]/.test(slug)) {
      throw new Error(`Could not build valid slug from exerciseName ${exerciseName}`);
    }

    // Generate embedding for exercise name
    const embedding = await embeddingService.generateEmbedding(exerciseName);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Create exercise in database with needsReview flag and embedding
    const createdExercise = await exerciseRepository.create({
      slug,
      name: exerciseName,
      tags: [],
      needsReview: true,
      name_embedding: embeddingStr,
    });

    return createdExercise;
  }

  /**
   * Create a new exercise using LLM to generate metadata
   * Sets needsReview: true to indicate this needs admin review
   * Automatically generates embedding for semantic search
   */
  async function createExerciseFromLLM(exerciseName: string): Promise<ExerciseType> {
    // Use LLM to generate exercise metadata
    const metadata = await generateExerciseMetadata(exerciseName);

    // Generate embedding for exercise name
    const embedding = await embeddingService.generateEmbedding(metadata.name);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Create exercise in database with needsReview flag and embedding
    const createdExercise = await exerciseRepository.create({
      slug: metadata.slug,
      name: metadata.name,
      tags: metadata.tags,
      needsReview: true,
      name_embedding: embeddingStr,
    });

    return createdExercise;
  }

  /**
   * Use LLM to generate exercise metadata from exercise name
   */
  async function generateExerciseMetadata(exerciseName: string): Promise<ExerciseMetadata> {
    const systemPrompt = `Generate exercise metadata for a fitness exercise.

You will be given an exercise name and need to generate:
1. slug: A URL-friendly slug (lowercase, hyphenated)
2. name: The proper display name for the exercise
3. tags: An array of relevant tags

Tag categories and examples:
- Muscle groups: chest, back, shoulders, biceps, triceps, abs, quads, hamstrings, glutes, calves
- Movement patterns: push, pull, hinge, squat, lunge, carry, rotate
- Equipment: barbell, dumbbell, cable, machine, bodyweight, kettlebell, resistance-band, trx, box, bench
- Exercise type: compound, isolation, plyometric, isometric, unilateral, bilateral
- Difficulty: beginner, intermediate, advanced
- Categories: strength, cardio, flexibility, mobility, warmup, cooldown

Choose 3-6 relevant tags that best describe the exercise.

Examples:

Input: "Landmine Press"
Output:
{
  "slug": "landmine-press",
  "name": "Landmine Press",
  "tags": ["chest", "shoulders", "barbell", "push", "compound"]
}

Input: "DB Press (alternating)"
Output:
{
  "slug": "dumbbell-press-alternating",
  "name": "Dumbbell Press (Alternating)",
  "tags": ["chest", "shoulders", "dumbbell", "push", "unilateral"]
}

Input: "Cable Tricep Pushdown"
Output:
{
  "slug": "cable-tricep-pushdown",
  "name": "Cable Tricep Pushdown",
  "tags": ["triceps", "arms", "cable", "push", "isolation"]
}

Input: "Box Jumps"
Output:
{
  "slug": "box-jumps",
  "name": "Box Jumps",
  "tags": ["quads", "glutes", "calves", "plyometric", "box", "power"]
}`;

    const userMessage = `Exercise name: "${exerciseName}"

Generate the exercise metadata in JSON format.`;

    const response = await llmService.call<ExerciseMetadata>(
      systemPrompt,
      userMessage,
      'haiku',
      {
        jsonMode: true,
        temperature: 0.1,
      }
    );

    return response.content;
  }

  return {
    createPlainExercise,
    createExerciseFromLLM,
  };
}

export type ExerciseCreationService = ReturnType<typeof createExerciseCreationService>;
