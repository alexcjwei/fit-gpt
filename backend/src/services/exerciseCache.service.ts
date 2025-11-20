import type Redis from 'ioredis';
import type { ExerciseRepository } from '../repositories/ExerciseRepository';

/**
 * Service for caching exercise name → ID mappings in Redis
 * Provides fast lookup of exercise IDs by normalized exercise names
 */
export function createExerciseCacheService(
  redisClient: Redis | null,
  exerciseRepository: ExerciseRepository
) {
  const CACHE_KEY_PREFIX = 'exercise:name:';
  const EMBEDDING_CACHE_KEY_PREFIX = 'embedding:';

  /**
   * Normalize exercise name for consistent cache keys
   * - Trim whitespace
   * - Lowercase
   * - Replace special chars (hyphens, slashes, apostrophes) with underscores
   * - Collapse multiple underscores into single underscore
   */
  function getNormalizedName(exerciseName: string): string {
    return exerciseName
      .trim()
      .toLowerCase()
      .replace(/[-\/'\s]+/g, '_')
      .replace(/_+/g, '_');
  }

  /**
   * Get exercise ID from cache by normalized name
   * Returns null if not found or if Redis is unavailable
   */
  async function get(normalizedName: string): Promise<string | null> {
    if (!redisClient) {
      return null;
    }

    try {
      const key = `${CACHE_KEY_PREFIX}${normalizedName}`;
      const exerciseId = await redisClient.get(key);
      return exerciseId;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set exercise ID in cache by normalized name
   * Gracefully handles Redis errors
   */
  async function set(normalizedName: string, exerciseId: string): Promise<void> {
    if (!redisClient) {
      return;
    }

    try {
      const key = `${CACHE_KEY_PREFIX}${normalizedName}`;
      await redisClient.set(key, exerciseId);
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  /**
   * Batch set multiple exercise name → ID mappings
   * More efficient than calling set() repeatedly
   */
  async function setMany(entries: Map<string, string>): Promise<void> {
    if (!redisClient || entries.size === 0) {
      return;
    }

    try {
      // Build flat array for mset: [key1, value1, key2, value2, ...]
      const args: string[] = [];
      for (const [normalizedName, exerciseId] of entries) {
        const key = `${CACHE_KEY_PREFIX}${normalizedName}`;
        args.push(key, exerciseId);
      }

      await redisClient.mset(args);
    } catch (error) {
      console.error('Redis mset error:', error);
    }
  }

  /**
   * Invalidate (delete) a cache entry by normalized name
   * Should be called when an exercise is updated or deleted
   */
  async function invalidate(normalizedName: string): Promise<void> {
    if (!redisClient) {
      return;
    }

    try {
      const key = `${CACHE_KEY_PREFIX}${normalizedName}`;
      await redisClient.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

  /**
   * Clear all cache entries
   * Warning: This clears the entire Redis database, not just exercise cache
   */
  async function clear(): Promise<void> {
    if (!redisClient) {
      return;
    }

    try {
      await redisClient.flushdb();
    } catch (error) {
      console.error('Redis flushdb error:', error);
    }
  }

  /**
   * Get embedding from cache by normalized name
   * Returns null if not found or if Redis is unavailable
   */
  async function getEmbedding(normalizedName: string): Promise<number[] | null> {
    if (!redisClient) {
      return null;
    }

    try {
      const key = `${EMBEDDING_CACHE_KEY_PREFIX}${normalizedName}`;
      const embeddingJson = await redisClient.get(key);

      if (!embeddingJson) {
        return null;
      }

      // Parse JSON to array of numbers
      return JSON.parse(embeddingJson);
    } catch (error) {
      console.error('Redis embedding get error:', error);
      return null;
    }
  }

  /**
   * Set embedding in cache by normalized name
   * Gracefully handles Redis errors
   */
  async function setEmbedding(normalizedName: string, embedding: number[]): Promise<void> {
    if (!redisClient) {
      return;
    }

    try {
      const key = `${EMBEDDING_CACHE_KEY_PREFIX}${normalizedName}`;
      const embeddingJson = JSON.stringify(embedding);
      await redisClient.set(key, embeddingJson);
    } catch (error) {
      console.error('Redis embedding set error:', error);
    }
  }

  /**
   * Batch set multiple embedding mappings
   * More efficient than calling setEmbedding() repeatedly
   */
  async function setManyEmbeddings(entries: Map<string, number[]>): Promise<void> {
    if (!redisClient || entries.size === 0) {
      return;
    }

    try {
      // Build flat array for mset: [key1, value1, key2, value2, ...]
      const args: string[] = [];
      for (const [normalizedName, embedding] of entries) {
        const key = `${EMBEDDING_CACHE_KEY_PREFIX}${normalizedName}`;
        const embeddingJson = JSON.stringify(embedding);
        args.push(key, embeddingJson);
      }

      await redisClient.mset(args);
    } catch (error) {
      console.error('Redis embedding mset error:', error);
    }
  }

  /**
   * Warm up cache by loading all exercises from database
   * Should be called on application startup
   * Caches both exercise name→ID mappings and embeddings
   */
  async function warmup(): Promise<void> {
    if (!redisClient) {
      return;
    }

    try {
      // Fetch all exercises from database with embeddings
      const exercises = await exerciseRepository.findAllWithEmbeddings();

      if (exercises.length === 0) {
        return;
      }

      // Build normalized name → ID map
      const nameEntries = new Map<string, string>();
      const embeddingEntries = new Map<string, number[]>();

      for (const exercise of exercises) {
        const normalizedName = getNormalizedName(exercise.name);
        nameEntries.set(normalizedName, exercise.id);

        // Cache embedding if it exists
        if (exercise.name_embedding) {
          embeddingEntries.set(normalizedName, exercise.name_embedding);
        }
      }

      // Batch set all entries
      await setMany(nameEntries);

      // Batch set embeddings if any exist
      if (embeddingEntries.size > 0) {
        await setManyEmbeddings(embeddingEntries);
      }

      console.log(`Exercise cache warmed up with ${exercises.length} exercises (${embeddingEntries.size} with embeddings)`);
    } catch (error) {
      console.error('Error warming up exercise cache:', error);
    }
  }

  return {
    getNormalizedName,
    get,
    set,
    setMany,
    invalidate,
    clear,
    warmup,
    getEmbedding,
    setEmbedding,
    setManyEmbeddings,
  };
}

export type ExerciseCacheService = ReturnType<typeof createExerciseCacheService>;
