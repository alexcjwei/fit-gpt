import type Redis from 'ioredis';
import type { ExerciseRepository } from '../repositories/ExerciseRepository';
import type { Exercise } from '../types';
import { normalizeForCache } from '../utils/stringNormalization';

export interface SemanticSearchResult {
  exercise: Exercise;
  similarity: number;
}

/**
 * Service for caching exercise data in Redis
 * - Caches exercise name → ID mappings for fast lookup
 * - Caches semantic search query → results to reduce embedding API calls
 */
export function createExerciseCacheService(
  redisClient: Redis | null,
  exerciseRepository: ExerciseRepository
) {
  const CACHE_KEY_PREFIX = 'exercise:name:';
  const SEARCH_CACHE_KEY_PREFIX = 'search:';

  /**
   * Normalize exercise name or search query for consistent cache keys
   * Uses centralized normalization utility
   */
  function getNormalizedName(exerciseName: string): string {
    return normalizeForCache(exerciseName);
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
   * Get cached semantic search results for a query
   * Returns null if not found or if Redis is unavailable
   */
  async function getSearchResults(normalizedQuery: string): Promise<SemanticSearchResult[] | null> {
    if (!redisClient) {
      return null;
    }

    try {
      const key = `${SEARCH_CACHE_KEY_PREFIX}${normalizedQuery}`;
      const resultsJson = await redisClient.get(key);

      if (!resultsJson) {
        return null;
      }

      // Parse JSON to array of search results
      return JSON.parse(resultsJson);
    } catch (error) {
      console.error('Redis search results get error:', error);
      return null;
    }
  }

  /**
   * Cache semantic search results for a query
   * No expiration set - cache persists until exercises are updated
   * Gracefully handles Redis errors
   */
  async function setSearchResults(normalizedQuery: string, results: SemanticSearchResult[]): Promise<void> {
    if (!redisClient) {
      return;
    }

    try {
      const key = `${SEARCH_CACHE_KEY_PREFIX}${normalizedQuery}`;
      const resultsJson = JSON.stringify(results);
      await redisClient.set(key, resultsJson);
    } catch (error) {
      console.error('Redis search results set error:', error);
    }
  }

  /**
   * Invalidate all search result caches
   * Should be called when exercises are created, updated, or deleted
   */
  async function invalidateSearchCache(): Promise<void> {
    if (!redisClient) {
      return;
    }

    try {
      // Delete all keys matching the search cache prefix
      const keys = await redisClient.keys(`${SEARCH_CACHE_KEY_PREFIX}*`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      console.error('Redis search cache invalidation error:', error);
    }
  }

  /**
   * Warm up cache by loading all exercises from database
   * Should be called on application startup
   * Caches exercise name→ID mappings only
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
      const nameEntries = new Map<string, string>();

      for (const exercise of exercises) {
        const normalizedName = getNormalizedName(exercise.name);
        nameEntries.set(normalizedName, exercise.id);
      }

      // Batch set all entries
      await setMany(nameEntries);

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
    getSearchResults,
    setSearchResults,
    invalidateSearchCache,
  };
}

export type ExerciseCacheService = ReturnType<typeof createExerciseCacheService>;
