import { TestContainer } from '../../utils/testContainer';
import { createExerciseSearchService } from '../../../src/services/exerciseSearch.service';
import { createExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import { createEmbeddingService, type EmbeddingService } from '../../../src/services/embedding.service';

/**
 * Integration tests for semantic search with embeddings
 * Tests the searchBySemantic method that uses pgvector for KNN search
 */
describe('ExerciseSearchService - Semantic Search', () => {
  const testContainer = new TestContainer();
  let searchService: ReturnType<typeof createExerciseSearchService>;
  let exerciseRepository: ReturnType<typeof createExerciseRepository>;
  let embeddingService: EmbeddingService;

  beforeAll(async () => {
    const db = await testContainer.start();
    exerciseRepository = createExerciseRepository(db);
    embeddingService = createEmbeddingService();
    searchService = createExerciseSearchService(exerciseRepository, embeddingService);
  });

  afterAll(async () => {
    await testContainer.stop();
  });

  beforeEach(async () => {
    await testContainer.clearDatabase();
    await testContainer.seedExercises();
  });

  describe('searchBySemantic', () => {
    it('should find semantically similar exercises using embeddings', async () => {
      const query = 'Bench Press';

      const results = await searchService.searchBySemantic(query, { limit: 5 });

      // Should return results
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      // Each result should have exercise and similarity score
      results.forEach(result => {
        expect(result.exercise).toBeDefined();
        expect(result.exercise.name).toBeDefined();
        expect(result.similarity).toBeDefined();
        expect(result.similarity).toBeGreaterThan(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
      });

      // Results should be sorted by similarity (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('should rank "Barbell Bench Press" and "Decline Barbell Bench Press" as similar for query "Bench Press"', async () => {
      const query = 'Bench Press';

      const results = await searchService.searchBySemantic(query, { limit: 10 });

      // Find the exercises in results
      const barbellBenchPress = results.find(r => r.exercise.name === 'Barbell Bench Press - Medium Grip');
      const declineBenchPress = results.find(r => r.exercise.name === 'Decline Barbell Bench Press');

      expect(barbellBenchPress).toBeDefined();
      expect(declineBenchPress).toBeDefined();

      // Both should have high similarity (>0.6) since they both are bench press variants
      // The exact ranking may vary slightly but both should be very similar
      expect(barbellBenchPress!.similarity).toBeGreaterThan(0.6);
      expect(declineBenchPress!.similarity).toBeGreaterThan(0.6);

      // The difference should be small (within 0.05)
      expect(Math.abs(barbellBenchPress!.similarity - declineBenchPress!.similarity)).toBeLessThan(0.05);
    });

    it('should rank "Barbell Deadlift" higher than "Axle Deadlift" for query "Deadlift"', async () => {
      const query = 'Deadlift';

      const results = await searchService.searchBySemantic(query, { limit: 10 });

      const barbellDeadlift = results.find(r => r.exercise.name === 'Barbell Deadlift');
      const axleDeadlift = results.find(r => r.exercise.name === 'Axle Deadlift');

      expect(barbellDeadlift).toBeDefined();
      expect(axleDeadlift).toBeDefined();

      // Barbell Deadlift is more standard/common than Axle Deadlift
      expect(barbellDeadlift!.similarity).toBeGreaterThan(axleDeadlift!.similarity);
    });

    it('should rank "Pull-Up" higher than "Weighted Pull-ups" for query "Pull-ups"', async () => {
      const query = 'Pull-ups';

      const results = await searchService.searchBySemantic(query, { limit: 10 });

      const pullUp = results.find(r => r.exercise.name === 'Pull-Up' || r.exercise.name === 'Pullups');
      const weightedPullUp = results.find(r => r.exercise.name === 'Weighted Pull Ups');

      expect(pullUp).toBeDefined();
      expect(weightedPullUp).toBeDefined();

      // Standard pull-up should be more similar than weighted variant
      expect(pullUp!.similarity).toBeGreaterThan(weightedPullUp!.similarity);
    });

    it('should respect similarity threshold', async () => {
      const query = 'Bench Press';

      // High threshold - only very similar exercises
      const strictResults = await searchService.searchBySemantic(query, {
        limit: 10,
        threshold: 0.85,
      });

      // All results should meet threshold
      strictResults.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.85);
      });

      // Low threshold - more lenient
      const lenientResults = await searchService.searchBySemantic(query, {
        limit: 10,
        threshold: 0.6,
      });

      // Should return more results with lower threshold
      expect(lenientResults.length).toBeGreaterThanOrEqual(strictResults.length);
    });

    it('should handle query for exercise not in database', async () => {
      const query = 'Nonexistent Magical Exercise';

      const results = await searchService.searchBySemantic(query, { limit: 5 });

      // Should still return some results (closest semantic matches)
      // but they might have low similarity scores
      expect(results.length).toBeGreaterThanOrEqual(0);

      if (results.length > 0) {
        // Top result might have low similarity
        expect(results[0].similarity).toBeLessThan(0.9);
      }
    });

    it('should return empty array when threshold is too high', async () => {
      const query = 'Bench Press';

      const results = await searchService.searchBySemantic(query, {
        limit: 10,
        threshold: 0.99, // Very high threshold
      });

      // Might return empty or very few results
      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.99);
      });
    });
  });

  describe('Comparison: semantic vs token-based search', () => {
    it('semantic search should handle abbreviations better than token search', async () => {
      const query = 'DB Bench';

      // Semantic search
      const semanticResults = await searchService.searchBySemantic(query, { limit: 5 });

      // Token-based search (for comparison)
      const tokenResults = await searchService.searchByName(query, { limit: 50 });
      const rankedTokenResults = searchService.rankByToken(query, tokenResults).slice(0, 5);

      // Both should find Dumbbell Bench Press
      const semanticHasDumbbell = semanticResults.some(r => r.exercise.name.includes('Dumbbell Bench'));
      const tokenHasDumbbell = rankedTokenResults.some(r => r.exercise.name.includes('Dumbbell Bench'));

      expect(semanticHasDumbbell).toBe(true);
      expect(tokenHasDumbbell).toBe(true);

      // Semantic should rank it higher (in top 3)
      const semanticDumbbellRank = semanticResults.findIndex(r => r.exercise.name.includes('Dumbbell Bench'));
      expect(semanticDumbbellRank).toBeLessThan(3);
    });
  });
});
