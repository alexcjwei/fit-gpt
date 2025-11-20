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
 * Tests the resolveExerciseName method to ensure it correctly maps
 * common exercise names to the appropriate exercise slugs in the database.
 */
describe('IDExtractor - resolveExerciseName', () => {
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

  describe('Basic exercise name resolution', () => {
    it('should resolve "Barbell Bench Press" to a bench press variant', async () => {
      const workoutText = 'Barbell Bench Press 3x8 @ 185 lbs';
      const result = await idExtractor.extract(workoutText);

      expect(result['Barbell Bench Press']).toBeDefined();

      // Should resolve to a bench press variant, not decline bench press
      const slug = result['Barbell Bench Press'];
      expect(slug).toMatch(/bench.*press/i);
      expect(slug).not.toBe('decline-barbell-bench-press');

      // Acceptable matches (in order of preference):
      // 1. barbell-bench-press (if it exists)
      // 2. barbell-bench-press-medium-grip (acceptable variant)
      // 3. bench-press-powerlifting (acceptable variant)
      const acceptableMatches = [
        'barbell-bench-press',
        'barbell-bench-press-medium-grip',
        'bench-press-powerlifting',
      ];

      expect(acceptableMatches).toContain(slug);
    });

    it('should resolve "Deadlift" to conventional barbell deadlift', async () => {
      const workoutText = 'Deadlift 3x5 @ 275 lbs';
      const result = await idExtractor.extract(workoutText);

      expect(result['Deadlift']).toBeDefined();

      const slug = result['Deadlift'];

      // Should resolve to barbell deadlift, not axle or other variants
      expect(slug).toBe('barbell-deadlift');
      expect(slug).not.toBe('axle-deadlift');
      expect(slug).not.toBe('romanian-deadlift-barbell');
    });

    it('should resolve "Pull-ups" to standard pull-up', async () => {
      const workoutText = 'Pull-ups 4 sets to failure';
      const result = await idExtractor.extract(workoutText);

      expect(result['Pull-ups']).toBeDefined();

      const slug = result['Pull-ups'];

      // Should resolve to standard pull-up, not weighted or band-assisted
      const acceptableMatches = [
        'pull-up',
        'pullups',
      ];

      expect(acceptableMatches).toContain(slug);
      expect(slug).not.toBe('weighted-pull-ups');
      expect(slug).not.toBe('band-assisted-pull-up');
    });

    it('should resolve "Barbell Squat" correctly', async () => {
      const workoutText = 'Barbell Squat 5x5 @ 225 lbs';
      const result = await idExtractor.extract(workoutText);

      expect(result['Barbell Squat']).toBeDefined();

      const slug = result['Barbell Squat'];
      expect(slug).toBe('barbell-squat');
    });
  });

  describe('Exercise name variations', () => {
    it('should handle "Bench Press" (without "Barbell" prefix)', async () => {
      const workoutText = 'Bench Press 3x8';
      const result = await idExtractor.extract(workoutText);

      expect(result['Bench Press']).toBeDefined();

      const slug = result['Bench Press'];
      expect(slug).toMatch(/bench.*press/i);
      expect(slug).not.toBe('decline-barbell-bench-press');
      expect(slug).not.toBe('dumbbell-bench-press');
    });

    it('should handle "DB Bench Press" as dumbbell variant', async () => {
      const workoutText = 'DB Bench Press 3x10';
      const result = await idExtractor.extract(workoutText);

      expect(result['DB Bench Press']).toBeDefined();

      const slug = result['DB Bench Press'];
      expect(slug).toBe('dumbbell-bench-press');
    });

    it('should handle "Pullups" (one word)', async () => {
      const workoutText = 'Pullups 3x8';
      const result = await idExtractor.extract(workoutText);

      expect(result['Pullups']).toBeDefined();

      const slug = result['Pullups'];
      const acceptableMatches = ['pull-up', 'pullups'];
      expect(acceptableMatches).toContain(slug);
    });
  });

  describe('Multiple exercises in one workout', () => {
    it('should correctly resolve all exercises in a multi-exercise workout', async () => {
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

      // Bench Press
      expect(result['Barbell Bench Press']).toBeDefined();
      expect(result['Barbell Bench Press']).not.toBe('decline-barbell-bench-press');

      // Squat
      expect(result['Barbell Squat']).toBe('barbell-squat');

      // Deadlift
      expect(result['Deadlift']).toBe('barbell-deadlift');

      // Pull-ups
      const pullUpSlug = result['Pull-ups'];
      expect(['pull-up', 'pullups']).toContain(pullUpSlug);
      expect(pullUpSlug).not.toBe('weighted-pull-ups');
    });
  });

  describe('Edge cases', () => {
    it('should handle exercise names with parenthetical modifiers', async () => {
      const workoutText = 'Reverse Lunges (alternating) 3x10 each side';
      const result = await idExtractor.extract(workoutText);

      // The LLM should extract "Reverse Lunges" without the "(alternating)"
      expect(result['Reverse Lunges'] || result['Reverse Lunges (alternating)']).toBeDefined();
    });

    it('should handle exercises with equipment prefixes', async () => {
      const workoutText = `
1. DB Rows 3x10
2. BB Curls 3x12
      `.trim();

      const result = await idExtractor.extract(workoutText);

      // Should expand abbreviations
      expect(result['DB Rows']).toBeDefined();
      expect(result['BB Curls']).toBeDefined();
    });

    it('should not create duplicate entries for same exercise', async () => {
      const workoutText = `
1. Bench Press 3x8
2. Bench Press 1x5 (heavy)
      `.trim();

      const result = await idExtractor.extract(workoutText);

      // Should only have one entry for Bench Press
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['Bench Press']).toBeDefined();
    });
  });

  describe('Fuzzy search ranking', () => {
    it('should prefer simpler exercises over complex variants', async () => {
      // Test that "Deadlift" prefers "Barbell Deadlift" over "Axle Deadlift",
      // "Deficit Deadlift", "Romanian Deadlift", etc.
      const workoutText = 'Deadlift 1x5';
      const result = await idExtractor.extract(workoutText);

      const slug = result['Deadlift'];

      // Should be the standard barbell deadlift
      expect(slug).toBe('barbell-deadlift');

      // Should NOT be any of these variants:
      const incorrectMatches = [
        'axle-deadlift',
        'romanian-deadlift-barbell',
        'deficit-deadlift',
        'clean-deadlift',
        'cable-deadlifts',
        'car-deadlift',
      ];

      expect(incorrectMatches).not.toContain(slug);
    });

    it('should prefer exact word matches over partial matches', async () => {
      // "Pull-up" should match "pull-up" or "pullups", not "band-assisted-pull-up"
      const workoutText = 'Pull-up 3xAMAP';
      const result = await idExtractor.extract(workoutText);

      const slug = result['Pull-up'];

      const acceptableMatches = ['pull-up', 'pullups'];
      expect(acceptableMatches).toContain(slug);

      // Should NOT be assisted or weighted variants
      expect(slug).not.toMatch(/assisted/i);
      expect(slug).not.toMatch(/weighted/i);
      expect(slug).not.toMatch(/band/i);
    });
  });
});
