import { Kysely, sql } from 'kysely';
import { Database, ExercisesTable, ExerciseTagsTable } from '../db/types';
import { Exercise } from '../types';

/**
 * Convert database exercise row to Exercise domain type
 */
function toExercise(row: ExercisesTable, tags: string[] = []): Exercise {
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
}

export interface UpdateExerciseData {
  slug?: string;
  name?: string;
  tags?: string[];
  needsReview?: boolean;
}

export interface ExerciseFilters {
  tags?: string[]; // Filter by tags (OR logic - matches any tag)
  nameQuery?: string; // Search by name substring
  needsReview?: boolean; // Filter by needsReview flag
}

export class ExerciseRepository {
  constructor(private db: Kysely<Database>) {}

  /**
   * Create a new exercise with tags
   */
  async create(data: CreateExerciseData): Promise<Exercise> {
    return await this.db.transaction().execute(async (trx) => {
      // Insert exercise
      const exercise = await trx
        .insertInto('exercises')
        .values({
          slug: data.slug,
          name: data.name,
          needs_review: data.needsReview ?? false,
        })
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
  }

  /**
   * Find exercise by ID with tags
   */
  async findById(id: string): Promise<Exercise | null> {
    // Get exercise
    const exercise = await this.db
      .selectFrom('exercises')
      .selectAll()
      .where('id', '=', BigInt(id))
      .executeTakeFirst();

    if (!exercise) {
      return null;
    }

    // Get tags
    const tagRows = await this.db
      .selectFrom('exercise_tags')
      .select('tag')
      .where('exercise_id', '=', exercise.id)
      .execute();

    const tags = tagRows.map((row) => row.tag);

    return toExercise(exercise, tags);
  }

  /**
   * Find exercise by slug with tags
   */
  async findBySlug(slug: string): Promise<Exercise | null> {
    // Get exercise
    const exercise = await this.db
      .selectFrom('exercises')
      .selectAll()
      .where('slug', '=', slug)
      .executeTakeFirst();

    if (!exercise) {
      return null;
    }

    // Get tags
    const tagRows = await this.db
      .selectFrom('exercise_tags')
      .select('tag')
      .where('exercise_id', '=', exercise.id)
      .execute();

    const tags = tagRows.map((row) => row.tag);

    return toExercise(exercise, tags);
  }

  /**
   * Get all exercises with optional filters
   */
  async findAll(filters?: ExerciseFilters): Promise<Exercise[]> {
    let query = this.db.selectFrom('exercises').selectAll();

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
      const exercisesWithTags = await this.db
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

      const allTags = await this.db
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
    const allTags = await this.db
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
  }

  /**
   * Update exercise by ID
   */
  async update(id: string, updates: UpdateExerciseData): Promise<Exercise | null> {
    return await this.db.transaction().execute(async (trx) => {
      // Build update object with only provided fields
      const updateData: Partial<ExercisesTable> = {};

      if (updates.slug !== undefined) {
        updateData.slug = updates.slug;
      }
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      if (updates.needsReview !== undefined) {
        updateData.needs_review = updates.needsReview;
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
  }

  /**
   * Delete exercise by ID (CASCADE deletes tags automatically)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('exercises')
      .where('id', '=', BigInt(id))
      .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
  }

  /**
   * Search exercises by name using pg_trgm similarity
   * Returns exercises ordered by similarity score
   */
  async searchByName(query: string, limit = 10): Promise<Exercise[]> {
    // Using pg_trgm similarity search
    const exercises = await this.db
      .selectFrom('exercises')
      .selectAll()
      .where(sql`name % ${query}`) // % is the similarity operator
      .orderBy(sql`similarity(name, ${query})`, 'desc')
      .limit(limit)
      .execute();

    if (exercises.length === 0) {
      return [];
    }

    // Batch load tags
    const exerciseIds = exercises.map((e) => e.id);
    const allTags = await this.db
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
  }

  /**
   * Find exercises with a specific tag
   */
  async findByTag(tag: string): Promise<Exercise[]> {
    const exercises = await this.db
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
    const allTags = await this.db
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
  }

  /**
   * Check if an exercise with the given name already exists
   * @param name - Exercise name to check
   * @param excludeId - Optional ID to exclude from the check (for updates)
   */
  async checkDuplicateName(name: string, excludeId?: string): Promise<boolean> {
    let query = this.db
      .selectFrom('exercises')
      .select('id')
      .where('name', '=', name);

    if (excludeId !== undefined) {
      query = query.where('id', '!=', BigInt(excludeId));
    }

    const result = await query.executeTakeFirst();

    return !!result;
  }

  /**
   * Check if exercise exists by ID
   */
  async existsById(id: string): Promise<boolean> {
    const result = await this.db
      .selectFrom('exercises')
      .select('id')
      .where('id', '=', BigInt(id))
      .executeTakeFirst();

    return !!result;
  }

  /**
   * Check if exercise exists by slug
   */
  async existsBySlug(slug: string): Promise<boolean> {
    const result = await this.db
      .selectFrom('exercises')
      .select('id')
      .where('slug', '=', slug)
      .executeTakeFirst();

    return !!result;
  }
}
