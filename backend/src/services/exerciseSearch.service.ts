import { ExerciseRepository } from '../repositories/ExerciseRepository';
import { db } from '../db';
import { Exercise as ExerciseType } from '../types';

export interface ExerciseSearchResult {
  exercise: ExerciseType;
  score: number; // Placeholder for compatibility (always 0)
}

export interface ExerciseSearchOptions {
  limit?: number; // Default: 5
  threshold?: number; // Ignored (kept for API compatibility)
}

/**
 * Service for searching exercises by name using PostgreSQL full text search
 */
export class ExerciseSearchService {
  private repository: ExerciseRepository;

  /**
   * Common abbreviations mapping
   */
  private readonly abbreviations: Record<string, string> = {
    db: 'dumbbell',
    bb: 'barbell',
    rdl: 'romanian deadlift',
    ohp: 'overhead press',
    't-bar': 't bar',
    'ez bar': 'ez-bar',
    'lat pulldown': 'lat pull down',
    'lat pull-down': 'lat pull down',
  };

  constructor(repository?: ExerciseRepository) {
    this.repository = repository || new ExerciseRepository(db);
  }


  /**
   * Preprocess query to expand abbreviations
   */
  private preprocessQuery(query: string): string {
    let processed = query.toLowerCase().trim();

    // Replace abbreviations
    for (const [abbr, full] of Object.entries(this.abbreviations)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      processed = processed.replace(regex, full);
    }

    return processed;
  }

  /**
   * Search exercises by name using PostgreSQL full text search
   * Returns top N matches sorted by relevance
   */
  async searchByName(
    query: string,
    options: ExerciseSearchOptions = {}
  ): Promise<ExerciseSearchResult[]> {
    const { limit = 5 } = options;
    // threshold is ignored - full text search handles relevance ranking

    // Preprocess query
    const processedQuery = this.preprocessQuery(query);

    // Use repository's full text search
    const exercises = await this.repository.searchByName(processedQuery, limit);

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
  async findBestMatch(query: string, _minScore: number = 0.3): Promise<ExerciseType | null> {
    // _minScore is ignored - full text search handles relevance ranking at database level
    const results = await this.searchByName(query, { limit: 1 });

    if (results.length === 0) {
      return null;
    }

    return results[0].exercise;
  }

  /**
   * Refresh the exercise cache
   * No-op for full text search (kept for API compatibility)
   */
  async refreshCache(): Promise<void> {
    // No caching needed with database-based search
  }

  /**
   * Get all cached exercises
   * Returns empty array (kept for API compatibility)
   */
  getCachedExercises(): ExerciseType[] {
    // No caching with database-based search
    return [];
  }
}
