import Fuse from 'fuse.js';
import { Exercise } from '../models/Exercise';
import { Exercise as ExerciseType } from '../types';

export interface ExerciseSearchResult {
  exercise: ExerciseType;
  score: number; // 0-1, where 0 is perfect match, 1 is worst match
}

export interface ExerciseSearchOptions {
  limit?: number; // Default: 5
  threshold?: number; // 0-1, lower is more strict. Default: 0.8 (very lenient for fuzzy matching)
}

/**
 * Service for fuzzy searching exercises by name
 */
export class ExerciseSearchService {
  private fuse: Fuse<ExerciseType> | null = null;
  private exercises: ExerciseType[] = [];
  private lastCacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Common abbreviations mapping
   */
  private readonly abbreviations: Record<string, string> = {
    'db': 'dumbbell',
    'bb': 'barbell',
    'rdl': 'romanian deadlift',
    'ohp': 'overhead press',
    't-bar': 't bar',
    'ez bar': 'ez-bar',
    'lat pulldown': 'lat pull down',
    'lat pull-down': 'lat pull down',
  };

  /**
   * Initialize Fuse.js with exercises from database
   */
  private async initializeFuse(): Promise<void> {
    const now = Date.now();

    // Check if cache is still valid
    if (this.fuse !== null && this.fuse !== undefined && now - this.lastCacheTime < this.CACHE_TTL) {
      return;
    }

    // Fetch exercises from database
    const exerciseDocs = await Exercise.find({});

    this.exercises = exerciseDocs.map((doc) => ({
      id: (doc._id).toString(),
      name: doc.name,
      slug: doc.slug,
      category: doc.category,
      primaryMuscles: doc.primaryMuscles,
      secondaryMuscles: doc.secondaryMuscles,
      equipment: doc.equipment,
      difficulty: doc.difficulty,
      movementPattern: doc.movementPattern,
      isUnilateral: doc.isUnilateral,
      isCompound: doc.isCompound,
      description: doc.description,
      setupInstructions: doc.setupInstructions,
      formCues: doc.formCues,
      videoUrl: doc.videoUrl,
      alternativeExerciseIds: doc.alternativeExerciseIds,
      tags: doc.tags,
    }));

    // Initialize Fuse with exercises
    // Search across multiple fields with different weights
    this.fuse = new Fuse(this.exercises, {
      keys: [
        { name: 'name', weight: 0.5 },           // Name is most important
        { name: 'category', weight: 0.1 },
        { name: 'primaryMuscles', weight: 0.15 },
        { name: 'secondaryMuscles', weight: 0.05 },
        { name: 'equipment', weight: 0.1 },
        { name: 'tags', weight: 0.1 },
      ],
      threshold: 0.8, // Very lenient - cast a wide net, we filter by user threshold later
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });

    this.lastCacheTime = now;
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
   * Search exercises by name with fuzzy matching
   * Returns top N matches sorted by relevance
   */
  async searchByName(
    query: string,
    options: ExerciseSearchOptions = {}
  ): Promise<ExerciseSearchResult[]> {
    const { limit = 5, threshold = 0.8 } = options; // Very lenient default - we have AI fallback

    // Initialize Fuse if needed
    await this.initializeFuse();

    if (this.fuse === null || this.fuse === undefined) {
      return [];
    }

    // Preprocess query
    const processedQuery = this.preprocessQuery(query);

    // Perform search
    const results = this.fuse.search(processedQuery, { limit });

    // Filter by threshold and map to our result format
    return results
      .filter((result) => (result.score ?? 0) <= threshold)
      .map((result) => ({
        exercise: result.item,
        score: result.score ?? 0,
      }));
  }

  /**
   * Find best matching exercise (top result)
   * Returns null if no good match found
   */
  async findBestMatch(
    query: string,
    minScore: number = 0.8
  ): Promise<ExerciseType | null> {
    const results = await this.searchByName(query, { limit: 1, threshold: minScore });

    if (results.length === 0) {
      return null;
    }

    return results[0].exercise;
  }

  /**
   * Refresh the exercise cache
   * Useful when exercises are added/updated
   */
  async refreshCache(): Promise<void> {
    this.lastCacheTime = 0;
    await this.initializeFuse();
  }

  /**
   * Get all cached exercises
   */
  getCachedExercises(): ExerciseType[] {
    return this.exercises;
  }
}
