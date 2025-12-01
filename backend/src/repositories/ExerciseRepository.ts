import { Kysely, sql } from 'kysely';
import { Database } from '../db/types';
import { Exercise } from '../types';

/**
 * Convert database exercise row to Exercise domain type
 */
function toExercise(row: any, tags: string[] = []): Exercise {
  return {
    id: row.id.toString(),
    slug: row.slug,
    name: row.name,
    tags,
    needsReview: row.needs_review,
  };
}

export interface CreateExerciseData {
  slug: string;
  name: string;
  tags?: string[];
  needsReview?: boolean;
  name_embedding?: string; // Vector embedding for semantic search
}

export interface UpdateExerciseData {
  slug?: string;
  name?: string;
  tags?: string[];
  needsReview?: boolean;
  name_embedding?: string; // Vector embedding for semantic search
}

export interface ExerciseFilters {
  tags?: string[]; // Filter by tags (OR logic - matches any tag)
  nameQuery?: string; // Search by name substring
  needsReview?: boolean; // Filter by needsReview flag
}

/**
 * Create an Exercise Repository with injected database dependency
 * Factory function pattern for dependency injection
 */
export function createExerciseRepository(db: Kysely<Database>) {
  return {

    /**
     * Create a new exercise with tags
     */
    async create(data: CreateExerciseData): Promise<Exercise> {
      return await db.transaction().execute(async (trx) => {
      // Insert exercise
      const exerciseData: any = {
        slug: data.slug,
        name: data.name,
        needs_review: data.needsReview ?? false,
      };

      // Add embedding if provided
      if (data.name_embedding !== undefined) {
        exerciseData.name_embedding = data.name_embedding;
      }

      const exercise = await trx
        .insertInto('exercises')
        .values(exerciseData)
        .returningAll()
        .executeTakeFirstOrThrow();

      // Insert tags if provided
      const tags = data.tags || [];
      if (tags.length > 0) {
        await trx
          .insertInto('exercise_tags')
          .values(tags.map((tag) => ({ exercise_id: exercise.id, tag })))
          .execute();
      }

      return toExercise(exercise, tags);
    });
  },

  /**
   * Find exercise by ID with tags
   */
  async findById(id: string): Promise<Exercise | null> {
    // Get exercise
    const exercise = await db
      .selectFrom('exercises')
      .selectAll()
      .where('id', '=', BigInt(id))
      .executeTakeFirst();

    if (!exercise) {
      return null;
    }

    // Get tags
    const tagRows = await db
      .selectFrom('exercise_tags')
      .select('tag')
      .where('exercise_id', '=', exercise.id)
      .execute();

    const tags = tagRows.map((row) => row.tag);

    return toExercise(exercise, tags);
  },
  /**
   * Find exercise by slug with tags
   */
  async findBySlug(slug: string): Promise<Exercise | null> {
    // Get exercise
    const exercise = await db
      .selectFrom('exercises')
      .selectAll()
      .where('slug', '=', slug)
      .executeTakeFirst();

    if (!exercise) {
      return null;
    }

    // Get tags
    const tagRows = await db
      .selectFrom('exercise_tags')
      .select('tag')
      .where('exercise_id', '=', exercise.id)
      .execute();

    const tags = tagRows.map((row) => row.tag);

    return toExercise(exercise, tags);
  },
  /**
   * Get all exercises with optional filters
   */
  async findAll(filters?: ExerciseFilters): Promise<Exercise[]> {
    let query = db.selectFrom('exercises').selectAll();

    // Apply filters
    if (filters?.needsReview !== undefined) {
      query = query.where('needs_review', '=', filters.needsReview);
    }

    if (filters?.nameQuery) {
      // Case-insensitive substring search
      query = query.where('name', 'ilike', `%${filters.nameQuery}%`);
    }

    // If filtering by tags, we need a different query
    if (filters?.tags && filters.tags.length > 0) {
      // Get exercises that have any of the specified tags
      const exercisesWithTags = await db
        .selectFrom('exercises as e')
        .innerJoin('exercise_tags as et', 'et.exercise_id', 'e.id')
        .selectAll('e')
        .where('et.tag', 'in', filters.tags)
        .distinct()
        .execute();

      // Get all tags for these exercises
      const exerciseIds = exercisesWithTags.map((e) => e.id);
      if (exerciseIds.length === 0) {
        return [];
      }

      const allTags = await db
        .selectFrom('exercise_tags')
        .select(['exercise_id', 'tag'])
        .where('exercise_id', 'in', exerciseIds)
        .execute();

      // Group tags by exercise ID
      const tagsByExerciseId = new Map<bigint, string[]>();
      for (const tagRow of allTags) {
        const tags = tagsByExerciseId.get(tagRow.exercise_id) || [];
        tags.push(tagRow.tag);
        tagsByExerciseId.set(tagRow.exercise_id, tags);
      }

      return exercisesWithTags.map((exercise) =>
        toExercise(exercise, tagsByExerciseId.get(exercise.id) || [])
      );
    }

    // Execute query without tag filtering
    const exercises = await query.execute();

    // Batch load tags for all exercises
    if (exercises.length === 0) {
      return [];
    }

    const exerciseIds = exercises.map((e) => e.id);
    const allTags = await db
      .selectFrom('exercise_tags')
      .select(['exercise_id', 'tag'])
      .where('exercise_id', 'in', exerciseIds)
      .execute();

    // Group tags by exercise ID
    const tagsByExerciseId = new Map<bigint, string[]>();
    for (const tagRow of allTags) {
      const tags = tagsByExerciseId.get(tagRow.exercise_id) || [];
      tags.push(tagRow.tag);
      tagsByExerciseId.set(tagRow.exercise_id, tags);
    }

    return exercises.map((exercise) =>
      toExercise(exercise, tagsByExerciseId.get(exercise.id) || [])
    );
  },

  /**
   * Search exercises by semantic similarity using pgvector
   * Returns exercises ranked by cosine similarity to the query embedding
   */
  async searchBySemantic(
    queryEmbedding: number[],
    limit: number = 10,
    threshold: number = 0.0
  ): Promise<Array<{ exercise: Exercise; similarity: number }>> {
    // Convert embedding array to pgvector format
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Search using cosine distance (<=>)
    // Similarity = 1 - distance (so higher similarity = better match)
    const results = await db
      .selectFrom('exercises')
      .selectAll()
      .select(sql<number>`1 - (name_embedding <=> ${embeddingStr}::vector)`.as('similarity'))
      .where('name_embedding', 'is not', null)
      .where(sql<number>`1 - (name_embedding <=> ${embeddingStr}::vector)`, '>=', threshold)
      .orderBy(sql`name_embedding <=> ${embeddingStr}::vector`) // ASC for distance (closest first)
      .limit(limit)
      .execute();

    // Fetch tags for each exercise
    const exercisesWithTags = await Promise.all(
      results.map(async (row) => {
        const tags = await db
          .selectFrom('exercise_tags')
          .select('tag')
          .where('exercise_id', '=', row.id)
          .execute();

        return {
          exercise: toExercise(row, tags.map((t) => t.tag)),
          similarity: Number(row.similarity),
        };
      })
    );

    return exercisesWithTags;
  },

  /**
   * Update exercise by ID
   */
  async update(id: string, updates: UpdateExerciseData): Promise<Exercise | null> {
    return await db.transaction().execute(async (trx) => {
      // Build update object with only provided fields
      const updateData: any = {};

      if (updates.slug !== undefined) {
        updateData.slug = updates.slug;
      }
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      if (updates.needsReview !== undefined) {
        updateData.needs_review = updates.needsReview;
      }
      if (updates.name_embedding !== undefined) {
        updateData.name_embedding = updates.name_embedding;
      }

      // Always update the updated_at timestamp
      updateData.updated_at = new Date();

      // Update exercise
      const exercise = await trx
        .updateTable('exercises')
        .set(updateData)
        .where('id', '=', BigInt(id))
        .returningAll()
        .executeTakeFirst();

      if (!exercise) {
        return null;
      }

      // Update tags if provided
      let tags: string[] = [];
      if (updates.tags !== undefined) {
        // Delete existing tags
        await trx.deleteFrom('exercise_tags').where('exercise_id', '=', exercise.id).execute();

        // Insert new tags
        tags = updates.tags;
        if (tags.length > 0) {
          await trx
            .insertInto('exercise_tags')
            .values(tags.map((tag) => ({ exercise_id: exercise.id, tag })))
            .execute();
        }
      } else {
        // Tags not updated, fetch existing tags
        const tagRows = await trx
          .selectFrom('exercise_tags')
          .select('tag')
          .where('exercise_id', '=', exercise.id)
          .execute();

        tags = tagRows.map((row) => row.tag);
      }

      return toExercise(exercise, tags);
    });
  },
  /**
   * Delete exercise by ID (CASCADE deletes tags automatically)
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .deleteFrom('exercises')
      .where('id', '=', BigInt(id))
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  },
  /**
   * Search exercises by name using PostgreSQL full text search
   * Normalizes special characters (hyphens, slashes) to spaces for better matching
   * Returns exercises ordered by relevance (ts_rank)
   */
  async searchByName(query: string, limit = 10): Promise<Exercise[]> {
    // Normalize query: replace hyphens and slashes with spaces, then lowercase
    // This allows "chin up" to match "Chin-up" and "90 90 hip" to match "90/90 Hip Switch"
    const normalizedQuery = query
      .toLowerCase()
      .replace(/[-/]/g, ' ')
      .trim();

    // Use PostgreSQL full text search with the generated tsvector column
    // IMPORTANT: This uses the name_tsvector column created in migration 003:
    //   name_tsvector = to_tsvector('english', LOWER(REPLACE(REPLACE(name, '-', ' '), '/', ' ')))
    //   CREATE INDEX exercises_name_tsvector_idx ON exercises USING gin (name_tsvector)
    //
    // Full text search provides word-based matching, avoiding false positives
    // like "chin" matching "machine" that occur with trigram search.
    //
    // To verify index usage: EXPLAIN ANALYZE <query>

    const exercises = await db
      .selectFrom('exercises')
      .selectAll()
      .where(sql<boolean>`name_tsvector @@ plainto_tsquery('english', ${normalizedQuery})`)
      .orderBy(
        sql`ts_rank(name_tsvector, plainto_tsquery('english', ${normalizedQuery}))`,
        'desc'
      )
      .limit(limit)
      .execute();

    if (exercises.length === 0) {
      return [];
    }

    // Batch load tags
    const exerciseIds = exercises.map((e) => e.id);
    const allTags = await db
      .selectFrom('exercise_tags')
      .select(['exercise_id', 'tag'])
      .where('exercise_id', 'in', exerciseIds)
      .execute();

    // Group tags by exercise ID
    const tagsByExerciseId = new Map<bigint, string[]>();
    for (const tagRow of allTags) {
      const tags = tagsByExerciseId.get(tagRow.exercise_id) || [];
      tags.push(tagRow.tag);
      tagsByExerciseId.set(tagRow.exercise_id, tags);
    }

    return exercises.map((exercise) =>
      toExercise(exercise, tagsByExerciseId.get(exercise.id) || [])
    );
  },
  /**
   * Find exercises with a specific tag
   */
  async findByTag(tag: string): Promise<Exercise[]> {
    const exercises = await db
      .selectFrom('exercises as e')
      .innerJoin('exercise_tags as et', 'et.exercise_id', 'e.id')
      .selectAll('e')
      .where('et.tag', '=', tag)
      .distinct()
      .execute();

    if (exercises.length === 0) {
      return [];
    }

    // Batch load all tags for these exercises
    const exerciseIds = exercises.map((e) => e.id);
    const allTags = await db
      .selectFrom('exercise_tags')
      .select(['exercise_id', 'tag'])
      .where('exercise_id', 'in', exerciseIds)
      .execute();

    // Group tags by exercise ID
    const tagsByExerciseId = new Map<bigint, string[]>();
    for (const tagRow of allTags) {
      const tags = tagsByExerciseId.get(tagRow.exercise_id) || [];
      tags.push(tagRow.tag);
      tagsByExerciseId.set(tagRow.exercise_id, tags);
    }

    return exercises.map((exercise) =>
      toExercise(exercise, tagsByExerciseId.get(exercise.id) || [])
    );
  },
  /**
   * Check if an exercise with the given name already exists
   * @param name - Exercise name to check
   * @param excludeId - Optional ID to exclude from the check (for updates)
   */
  async checkDuplicateName(name: string, excludeId?: string): Promise<boolean> {
    let query = db
      .selectFrom('exercises')
      .select('id')
      .where('name', '=', name);

    if (excludeId !== undefined) {
      query = query.where('id', '!=', BigInt(excludeId));
    }

    const result = await query.executeTakeFirst();

    return !!result;
  },
  /**
   * Check if exercise exists by ID
   */
  async existsById(id: string): Promise<boolean> {
    const result = await db
      .selectFrom('exercises')
      .select('id')
      .where('id', '=', BigInt(id))
      .executeTakeFirst();

    return !!result;
  },

  /**
   * Check if exercise exists by slug
   */
  async existsBySlug(slug: string): Promise<boolean> {
    const result = await db
      .selectFrom('exercises')
      .select('id')
      .where('slug', '=', slug)
      .executeTakeFirst();

    return !!result;
  },

  /**
   * Get all exercises with their embeddings (for cache warmup)
   * Returns exercises with name_embedding parsed as number array
   */
  async findAllWithEmbeddings(): Promise<Array<{ id: string; name: string; name_embedding: number[] | null }>> {
    const exercises = await db
      .selectFrom('exercises')
      .select(['id', 'name', 'name_embedding'])
      .execute();

    return exercises.map((exercise) => ({
      id: exercise.id.toString(),
      name: exercise.name,
      name_embedding: exercise.name_embedding ? parseEmbedding(exercise.name_embedding) : null,
    }));
  },

  /**
   * Search exercises by trigram similarity using pg_trgm
   * Returns exercises ordered by similarity score (higher is better)
   * Uses PostgreSQL similarity() function to calculate trigram similarity
   */
  async searchByTrigram(
    query: string,
    limit: number = 10
  ): Promise<Array<{ exercise: Exercise; similarity: number }>> {
    // Use pg_trgm similarity function
    // The % operator is a shorthand for similarity() >= 0.3 threshold
    // We use similarity() function directly to get the score and apply our own filtering
    const results = await db
      .selectFrom('exercises')
      .selectAll()
      .select(sql<number>`similarity(name, ${query})`.as('similarity'))
      .where(sql<boolean>`name % ${query}`) // Trigram similarity operator (threshold ~0.3)
      .orderBy('similarity', 'desc')
      .limit(limit)
      .execute();

    if (results.length === 0) {
      return [];
    }

    // Batch load tags for each exercise
    const exerciseIds = results.map((e) => e.id);
    const allTags = await db
      .selectFrom('exercise_tags')
      .select(['exercise_id', 'tag'])
      .where('exercise_id', 'in', exerciseIds)
      .execute();

    // Group tags by exercise ID
    const tagsByExerciseId = new Map<bigint, string[]>();
    for (const tagRow of allTags) {
      const tags = tagsByExerciseId.get(tagRow.exercise_id) || [];
      tags.push(tagRow.tag);
      tagsByExerciseId.set(tagRow.exercise_id, tags);
    }

    return results.map((row) => ({
      exercise: toExercise(row, tagsByExerciseId.get(row.id) || []),
      similarity: Number(row.similarity),
    }));
  },
  };
}

/**
 * Parse embedding string from database to number array
 * Embeddings are stored as pgvector format: "[0.1, 0.2, ...]"
 */
function parseEmbedding(embeddingStr: string): number[] | null {
  try {
    // Remove brackets and split by comma
    const cleaned = embeddingStr.replace(/^\[|\]$/g, '');
    return cleaned.split(',').map(s => parseFloat(s.trim()));
  } catch (error) {
    console.error('Error parsing embedding:', error);
    return null;
  }
}

/**
 * Type definition for ExerciseRepository (inferred from factory return type)
 */
export type ExerciseRepository = ReturnType<typeof createExerciseRepository>;
