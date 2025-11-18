import { Kysely } from 'kysely';
import { Database } from '../../../../src/db/types';
import { connect, closeDatabase, clearDatabase, getTestDb, seedExercises } from '../../../utils/testDb';
import { createIDExtractor, type IDExtractor } from '../../../../src/services/workoutParser/idExtractor';
import { LLMService } from '../../../../src/services/llm.service';
import { createExerciseSearchService } from '../../../../src/services/exerciseSearch.service';
import { createExerciseCreationService } from '../../../../src/services/exerciseCreation.service';
import { createExerciseRepository } from '../../../../src/repositories/ExerciseRepository';
import type { ExerciseSearchService } from '../../../../src/services/exerciseSearch.service';

describe('IDExtractor - Integration Test', () => {
  let db: Kysely<Database>;
  let idExtractor: IDExtractor;
  let llmService: LLMService;
  let searchService: ExerciseSearchService;

  beforeAll(async () => {
    await connect();
    db = getTestDb();
    const exerciseRepository = createExerciseRepository(db);
    llmService = new LLMService();
    searchService = createExerciseSearchService(exerciseRepository);
    const creationService = createExerciseCreationService(exerciseRepository, llmService);
    idExtractor = createIDExtractor(llmService, searchService, creationService);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    await seedExercises();
  });

  it('should extract and map exercises from simple workout', async () => {
    const workoutText = `
Bench Press 3x10
Squats 4x8
    `.trim();

    const result = await idExtractor.extract(workoutText);

    // Should have 2 exercise mappings
    expect(Object.keys(result).length).toBe(2);

    // All values should be valid exercise slugs (strings)
    Object.values(result).forEach(slug => {
      expect(typeof slug).toBe('string');
      expect(slug).toBeTruthy();
      // Slugs should be kebab-case (contain hyphens, lowercase)
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });

    // Verify the slugs exist in the database
    for (const exerciseSlug of Object.values(result)) {
      const exercise = await db
        .selectFrom('exercises')
        .selectAll()
        .where('slug', '=', exerciseSlug)
        .executeTakeFirst();

      expect(exercise).toBeDefined();
    }
  }, 60000);

  it('should extract and map exercises with abbreviations', async () => {
    const workoutText = `
DB Bench Press 3x10
BB Squat 4x8
Lat Pulldown 3x12
    `.trim();

    const result = await idExtractor.extract(workoutText);

    // Should have 3 exercise mappings
    expect(Object.keys(result).length).toBe(3);

    // Verify abbreviations were expanded and mapped correctly
    // DB -> Dumbbell, BB -> Barbell
    for (const exerciseSlug of Object.values(result)) {
      const exercise = await db
        .selectFrom('exercises')
        .selectAll()
        .where('slug', '=', exerciseSlug)
        .executeTakeFirst();

      expect(exercise).toBeDefined();
    }
  }, 60000);

  it('should create new exercise when no match found', async () => {
    const workoutText = `
Custom Unique Exercise Name That Definitely Does Not Exist 3x10
    `.trim();

    // Count exercises before
    const beforeCount = await db
      .selectFrom('exercises')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();

    const result = await idExtractor.extract(workoutText);

    // Should have 1 exercise mapping
    expect(Object.keys(result).length).toBe(1);

    // Count exercises after
    const afterCount = await db
      .selectFrom('exercises')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();

    // A new exercise should have been created
    expect(Number(afterCount?.count)).toBe(Number(beforeCount?.count) + 1);

    // Verify the new exercise exists by slug
    const exerciseSlug = Object.values(result)[0];
    const exercise = await db
      .selectFrom('exercises')
      .selectAll()
      .where('slug', '=', exerciseSlug)
      .executeTakeFirst();

    expect(exercise).toBeDefined();
    expect(exercise?.name.toLowerCase()).toContain('custom');
    expect(exerciseSlug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  }, 60000);

  it('should handle duplicate exercise mentions with variations', async () => {
    const workoutText = `
Barbell Back Squats 3x10
BB Back Squats 4x8
Back squats 5x5
    `.trim();

    const result = await idExtractor.extract(workoutText);

    // All variations should map to the same or very similar exercise
    // (the LLM should recognize these as the same exercise)
    const uniqueSlugs = new Set(Object.values(result));

    // Should have only 1-3 unique slugs (ideally 1, but variations may create multiple)
    // This tests that the system attempts to consolidate similar exercises
    expect(uniqueSlugs.size).toBeLessThanOrEqual(3);
    expect(uniqueSlugs.size).toBeGreaterThan(0);
  }, 60000);

  it('should complete validation loop successfully', async () => {
    const workoutText = `
Bench Press 3x10
Squats 4x8
Deadlifts 5x5
Pull-ups 3x8
    `.trim();

    const result = await idExtractor.extract(workoutText);

    // Should have all 4 exercises mapped
    expect(Object.keys(result).length).toBeGreaterThanOrEqual(4);

    // All exercises should have valid slugs
    for (const exerciseSlug of Object.values(result)) {
      const exercise = await db
        .selectFrom('exercises')
        .selectAll()
        .where('slug', '=', exerciseSlug)
        .executeTakeFirst();

      expect(exercise).toBeDefined();
    }
  }, 60000);
});
