import { TestContainer } from '../../../utils/testContainer';
import { createIDExtractor } from '../../../../src/services/workoutParser/idExtractor';
import { LLMService } from '../../../../src/services/llm.service';
import { createExerciseSearchService } from '../../../../src/services/exerciseSearch.service';
import { createExerciseCreationService } from '../../../../src/services/exerciseCreation.service';
import { createExerciseRepository } from '../../../../src/repositories/ExerciseRepository';
import { createEmbeddingService } from '../../../../src/services/embedding.service';

/**
 * ID Extractor Integration Test
 *
 * Tests the extract method to ensure it correctly maps exercise names
 * to appropriate exercise slugs in the database, handling variations,
 * equipment prefixes, and fuzzy matching.
 */
describe('IDExtractor - extract', () => {
  const testContainer = new TestContainer();
  let idExtractor: ReturnType<typeof createIDExtractor>;

  beforeAll(async () => {
    const db = await testContainer.start();
    const exerciseRepository = createExerciseRepository(db);
    const llmService = new LLMService();
    const embeddingService = createEmbeddingService();
    const searchService = createExerciseSearchService(exerciseRepository, embeddingService);
    const creationService = createExerciseCreationService(exerciseRepository, llmService, embeddingService);
    idExtractor = createIDExtractor(llmService, searchService, creationService);
  });

  afterAll(async () => {
    await testContainer.stop();
  });

  beforeEach(async () => {
    await testContainer.clearDatabase();
    await testContainer.seedExercises();
  });

  it('should correctly resolve all exercises with variations and edge cases', async () => {
    const workoutText = `
Strength Training - November 15, 2024

1. Barbell Bench Press
   - 3x8 @ 185 lbs

2. Barbell Squat
   - 5x5 @ 225 lbs

3. Deadlift
   - 3x5 @ 275 lbs

4. Pull-ups
   - 4 sets to failure
    `.trim();

    const result = await idExtractor.extract(workoutText);

    // All exercises should be resolved
    expect(Object.keys(result)).toHaveLength(4);

    // Barbell Bench Press - should resolve to bench press variant, not decline
    expect(result['Barbell Bench Press']).toBeDefined();
    const benchSlug = result['Barbell Bench Press'];
    expect(benchSlug).toMatch(/bench.*press/i);
    expect(benchSlug).not.toBe('decline-barbell-bench-press');
    expect(['barbell-bench-press', 'bench-press']).toContain(benchSlug);

    // Barbell Squat
    expect(result['Barbell Squat']).toBe('barbell-squat');

    // Deadlift - should prefer standard barbell deadlift over variants
    expect(result['Deadlift']).toBe('barbell-deadlift');
    expect(result['Deadlift']).not.toBe('axle-deadlift');
    expect(result['Deadlift']).not.toBe('romanian-deadlift-barbell');

    // Pull-ups - should resolve to standard pull-up, not weighted or assisted
    const pullUpSlug = result['Pull-ups'];
    expect(['pull-up', 'pullups']).toContain(pullUpSlug);
    expect(pullUpSlug).not.toBe('weighted-pull-ups');
    expect(pullUpSlug).not.toBe('band-assisted-pull-up');
  }, 120000);
});
