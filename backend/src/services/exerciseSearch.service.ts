import type { ExerciseRepository } from '../repositories/ExerciseRepository';
import type { ExerciseCacheService } from './exerciseCache.service';
import type { EmbeddingService } from './embedding.service';
import { Exercise as ExerciseType } from '../types';

export interface ExerciseSearchResult {
  exercise: ExerciseType;
  score: number; // Placeholder for compatibility (always 0)
}

export interface SemanticSearchResult {
  exercise: ExerciseType;
  similarity: number; // Cosine similarity score (0-1)
}

export interface ExerciseSearchOptions {
  limit?: number; // Default: 5
  threshold?: number; // Ignored (kept for API compatibility)
}

/**
 * Common abbreviations mapping
 */
const abbreviations: Record<string, string> = {
  db: 'dumbbell',
  bb: 'barbell',
  rdl: 'romanian deadlift',
  ohp: 'overhead press',
  't-bar': 't bar',
  'ez bar': 'ez-bar',
  'lat pulldown': 'lat pull down',
  'lat pull-down': 'lat pull down',
};

/**
 * Service for searching exercises by name using PostgreSQL full text search
 * Optionally integrates with Redis cache for faster lookups
 */
export function createExerciseSearchService(
  exerciseRepository: ExerciseRepository,
  embeddingService?: EmbeddingService,
  cacheService?: ExerciseCacheService,
) {
  /**
   * Preprocess query to expand abbreviations
   */
  function preprocessQuery(query: string): string {
    let processed = query.toLowerCase().trim();

    // Replace abbreviations
    for (const [abbr, full] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      processed = processed.replace(regex, full);
    }

    return processed;
  }

  /**
   * Search exercises by name using PostgreSQL full text search
   * Returns top N matches sorted by relevance
   * Checks cache first if available
   */
  async function searchByName(
    query: string,
    options: ExerciseSearchOptions = {}
  ): Promise<ExerciseSearchResult[]> {
    const { limit = 5 } = options;
    // threshold is ignored - full text search handles relevance ranking

    // Preprocess query
    const processedQuery = preprocessQuery(query);

    // Check cache first if available
    if (cacheService) {
      const normalizedQuery = cacheService.getNormalizedName(query);
      const cachedExerciseId = await cacheService.get(normalizedQuery);

      if (cachedExerciseId) {
        // Cache hit - fetch exercise by ID
        const exercise = await exerciseRepository.findById(cachedExerciseId);
        if (exercise) {
          return [{ exercise, score: 0 }];
        }
      }
    }

    // Cache miss or no cache - use repository's full text search
    const exercises = await exerciseRepository.searchByName(processedQuery, limit);

    // Populate cache if exactly one result (unambiguous match)
    if (cacheService && exercises.length === 1) {
      const normalizedQuery = cacheService.getNormalizedName(query);
      await cacheService.set(normalizedQuery, exercises[0].id);
    }

    // Map to result format (score is always 0 for compatibility)
    return exercises.map((exercise) => ({
      exercise,
      score: 0,
    }));
  }

  /**
   * Find best matching exercise (top result)
   * Returns null if no good match found
   */
  async function findBestMatch(query: string, _minScore: number = 0.3): Promise<ExerciseType | null> {
    // _minScore is ignored - full text search handles relevance ranking at database level
    const results = await searchByName(query, { limit: 1 });

    if (results.length === 0) {
      return null;
    }

    return results[0].exercise;
  }

  /**
   * Refresh the exercise cache
   * No-op for full text search (kept for API compatibility)
   */
  async function refreshCache(): Promise<void> {
    // No caching needed with database-based search
  }

  /**
   * Get all cached exercises
   * Returns empty array (kept for API compatibility)
   */
  function getCachedExercises(): ExerciseType[] {
    // No caching with database-based search
    return [];
  }

  /**
   * Tokenize a string by normalizing and splitting into words
   */
  function tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[-/]/g, ' ') // Normalize hyphens and slashes to spaces
      .trim()
      .split(/\s+/) // Split on whitespace
      .filter((token) => token.length > 0);
  }

  /**
   * Compute token-based similarity score between query and exercise name
   *
   * Scoring formula:
   *   score = (exact token matches × 1.0) + (prefix matches × 0.5) - (extra distractor tokens × 0.1)
   *
   * This helps rank exercises by how well they match the user's query:
   * - Prioritizes exercises where all query tokens appear
   * - Penalizes exercises with extra words that don't match
   * - Example: "Bench Press" → "Barbell Bench Press" scores higher than "Close-Grip Barbell Bench Press"
   */
  function scoreByToken(query: string, exerciseName: string): number {
    // Preprocess both query and exercise name
    const processedQuery = preprocessQuery(query);
    const processedExerciseName = preprocessQuery(exerciseName);

    // Tokenize both strings
    const queryTokens = tokenize(processedQuery);
    const exerciseTokens = tokenize(processedExerciseName);

    let score = 0;

    // Count exact matches from query tokens
    for (const queryToken of queryTokens) {
      if (exerciseTokens.includes(queryToken)) {
        score += 1.0; // Exact match
      }
    }

    // Penalize extra tokens in exercise name that don't match query
    const extraTokens = exerciseTokens.length - queryTokens.length;
    if (extraTokens > 0) {
      score -= extraTokens * 0.1;
    }

    // Ensure score doesn't go negative
    return Math.max(0, score);
  }

  /**
   * Re-rank search results using token-based scoring
   *
   * Takes existing search results and re-sorts them based on how well
   * each exercise name matches the query using token overlap.
   *
   * Updates the score field in each result to reflect the token-based score.
   */
  function rankByToken(query: string, results: ExerciseSearchResult[]): ExerciseSearchResult[] {
    // Compute token score for each result
    const scoredResults = results.map((result) => ({
      ...result,
      score: scoreByToken(query, result.exercise.name),
    }));

    // Sort by score descending (highest first), preserving original order for ties
    return scoredResults.sort((a, b) => b.score - a.score);
  }

  /**
   * Search exercises by semantic similarity using embeddings
   * Requires embeddingService to be provided
   * Uses cache to reduce embedding API calls
   */
  async function searchBySemantic(
    query: string,
    options: ExerciseSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    if (!embeddingService) {
      throw new Error('EmbeddingService is required for semantic search');
    }

    const { limit = 10, threshold = 0.0 } = options;

    // Check cache first if available
    if (cacheService) {
      try {
        const normalizedQuery = cacheService.getNormalizedName(query);
        const cachedResults = await cacheService.getSearchResults(normalizedQuery);

        if (cachedResults) {
          // Filter and limit cached results based on current options
          return cachedResults
            .filter(result => result.similarity >= threshold)
            .slice(0, limit);
        }
      } catch (error) {
        console.error('Search cache lookup error, falling back to database:', error);
      }
    }

    // Cache miss or no cache - generate embedding and search
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Search using pgvector KNN
    const results = await exerciseRepository.searchBySemantic(
      queryEmbedding,
      limit,
      threshold
    );

    // Cache the results if cache is available
    if (cacheService && results.length > 0) {
      try {
        const normalizedQuery = cacheService.getNormalizedName(query);
        await cacheService.setSearchResults(normalizedQuery, results);
      } catch (error) {
        console.error('Search cache write error:', error);
      }
    }

    return results;
  }

  return {
    searchByName,
    findBestMatch,
    refreshCache,
    getCachedExercises,
    scoreByToken,
    rankByToken,
    searchBySemantic,
  };
}

export type ExerciseSearchService = ReturnType<typeof createExerciseSearchService>;
