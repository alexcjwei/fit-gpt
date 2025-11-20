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
   * Warm up cache by loading all exercises from database
   * Should be called on application startup
   */
  async function warmup(): Promise<void> {
    if (!redisClient) {
      return;
    }

    try {
      // Fetch all exercises from database
      const exercises = await exerciseRepository.findAll();

      if (exercises.length === 0) {
        return;
      }

      // Build normalized name → ID map
      const entries = new Map<string, string>();
      for (const exercise of exercises) {
        const normalizedName = getNormalizedName(exercise.name);
        entries.set(normalizedName, exercise.id);
      }

      // Batch set all entries
      await setMany(entries);

      console.log(`Exercise cache warmed up with ${exercises.length} exercises`);
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
  };
}

export type ExerciseCacheService = ReturnType<typeof createExerciseCacheService>;
