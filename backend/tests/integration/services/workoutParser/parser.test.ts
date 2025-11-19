import { Kysely } from 'kysely';
import { Database } from '../../../../src/db/types';
import { TestContainer } from '../../../utils/testContainer';
import { createParser, type Parser } from '../../../../src/services/workoutParser/parser';
import { LLMService } from '../../../../src/services/llm.service';

describe('Parser - Integration Test', () => {
  const testContainer = new TestContainer();
  let db: Kysely<Database>;
  let parser: Parser;
  let llmService: LLMService;
  let benchPressSlug: string;
  let squatSlug: string;
  let rowSlug: string;

  beforeAll(async () => {
    db = await testContainer.start();
    llmService = new LLMService();
    parser = createParser(llmService);
  });

  afterAll(async () => {
    await testContainer.stop();
  });

  beforeEach(async () => {
    await testContainer.clearDatabase();
    await testContainer.seedExercises();

    // Get some exercise slugs for testing
    const benchPress = await db
      .selectFrom('exercises')
      .select('slug')
      .where('name', 'ilike', '%bench press%')
      .where('name', 'ilike', '%barbell%')
      .executeTakeFirst();

    const squat = await db
      .selectFrom('exercises')
      .select('slug')
      .where('name', 'ilike', '%squat%')
      .where('name', 'ilike', '%barbell%')
      .executeTakeFirst();

    const row = await db
      .selectFrom('exercises')
      .select('slug')
      .where('name', 'ilike', '%row%')
      .where('name', 'ilike', '%barbell%')
      .executeTakeFirst();

    if (!benchPress || !squat || !row) {
      throw new Error('Required exercises not found in seed data');
    }

    benchPressSlug = benchPress.slug;
    squatSlug = squat.slug;
    rowSlug = row.slug;
  });

  it('should parse simple workout with pre-mapped slugs', async () => {
    const workoutText = `
Bench Press 3x10
Squats 4x8
    `.trim();

    const exerciseSlugMap = {
      'Bench Press': benchPressSlug,
      'Squats': squatSlug,
    };

    const result = await parser.parse(workoutText, exerciseSlugMap);

    // Should have basic workout structure
    expect(result.name).toBeDefined();
    expect(result.date).toBeDefined();
    expect(result.lastModifiedTime).toBeDefined();
    expect(result.blocks).toBeDefined();
    expect(result.blocks.length).toBeGreaterThan(0);

    // Check exercises have slugs (not yet converted to IDs - that happens in DatabaseFormatter)
    const allExercises = result.blocks.flatMap(block => block.exercises);
    expect(allExercises.length).toBe(2);

    // Verify all exercises have valid slugs (kebab-case format)
    allExercises.forEach(exercise => {
      expect(typeof exercise.exerciseId).toBe('string');
      expect(exercise.exerciseId).toBeTruthy();
      // exerciseId contains slug at this stage (converted to ID in DatabaseFormatter)
      expect(exercise.exerciseId).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });

    // Check sets were created
    allExercises.forEach(exercise => {
      expect(exercise.sets.length).toBeGreaterThan(0);
      expect(exercise.prescription).toBeDefined();
    });
  }, 60000);

  it('should parse workout with blocks and labels', async () => {
    const workoutText = `
Warm Up:
Jumping jacks 2x20

Main:
Bench Press 3x10
Squats 4x8
    `.trim();

    const exerciseSlugMap = {
      'Jumping jacks': benchPressSlug, // Just use any slug for testing
      'Bench Press': benchPressSlug,
      'Squats': squatSlug,
    };

    const result = await parser.parse(workoutText, exerciseSlugMap);

    // Should have multiple blocks
    expect(result.blocks.length).toBeGreaterThanOrEqual(2);

    // Check for labeled blocks
    const blockLabels = result.blocks.map(block => block.label).filter(Boolean);
    expect(blockLabels.length).toBeGreaterThan(0);
  }, 60000);

  it('should parse workout with supersets', async () => {
    const workoutText = `
Superset A:
1a. Bench Press 3x10
1b. Rows 3x10
    `.trim();

    const exerciseSlugMap = {
      'Bench Press': benchPressSlug,
      'Rows': rowSlug,
    };

    const result = await parser.parse(workoutText, exerciseSlugMap);

    // Should have at least one block
    expect(result.blocks.length).toBeGreaterThan(0);

    // The superset should be in a single block with 2 exercises
    const supersetBlock = result.blocks.find(block =>
      block.exercises.length >= 2
    );

    expect(supersetBlock).toBeDefined();
    expect(supersetBlock!.exercises.length).toBe(2);

    // Check orderInBlock is set correctly
    const orders = supersetBlock!.exercises.map(ex => ex.orderInBlock);
    expect(orders).toContain(0);
    expect(orders).toContain(1);
  }, 60000);

  it('should parse varying set schemes', async () => {
    const workoutText = `
Squats 5-3-1-1-1
    `.trim();

    const exerciseSlugMap = {
      'Squats': squatSlug,
    };

    const result = await parser.parse(workoutText, exerciseSlugMap);

    // Should have created the exercise
    const exercise = result.blocks[0].exercises[0];
    expect(exercise).toBeDefined();

    // Should have prescription that captures the varying sets
    expect(exercise.prescription).toBeDefined();
    expect(exercise.prescription).toContain('5');

    // Should have created multiple sets (5 sets total)
    expect(exercise.sets.length).toBe(5);
  }, 60000);

  it('should parse time-based exercises', async () => {
    const workoutText = `
Plank 3x60sec
    `.trim();

    const exerciseSlugMap = {
      'Plank': benchPressSlug, // Use any slug for testing
    };

    const result = await parser.parse(workoutText, exerciseSlugMap);

    const exercise = result.blocks[0].exercises[0];
    expect(exercise).toBeDefined();

    // Should have prescription with time
    expect(exercise.prescription?.toLowerCase()).toMatch(/sec|min|time/);

    // Should have created 3 sets
    expect(exercise.sets.length).toBe(3);
  }, 60000);

  it('should parse unilateral exercises', async () => {
    const workoutText = `
Lunges 3x8/leg
    `.trim();

    const exerciseSlugMap = {
      'Lunges': squatSlug, // Use any slug
    };

    const result = await parser.parse(workoutText, exerciseSlugMap);

    const exercise = result.blocks[0].exercises[0];
    expect(exercise).toBeDefined();

    // Should capture the /leg notation in prescription
    expect(exercise.prescription?.toLowerCase()).toMatch(/leg|side|ea/);

    // Should have created sets (possibly 6 sets for bilateral work, or 3 with notes)
    expect(exercise.sets.length).toBeGreaterThan(0);
  }, 60000);

  it('should handle custom date option', async () => {
    const workoutText = `
Bench Press 3x10
    `.trim();

    const exerciseSlugMap = {
      'Bench Press': benchPressSlug,
    };

    const customDate = '2024-12-25';
    const result = await parser.parse(workoutText, exerciseSlugMap, { date: customDate });

    // Should use the custom date
    expect(result.date).toBe(customDate);
  }, 60000);

  it('should handle custom weightUnit option', async () => {
    const workoutText = `
Bench Press 3x10
    `.trim();

    const exerciseSlugMap = {
      'Bench Press': benchPressSlug,
    };

    const result = await parser.parse(workoutText, exerciseSlugMap, { weightUnit: 'kg' });

    // All sets should have the correct weightUnit
    const exercise = result.blocks[0].exercises[0];
    exercise.sets.forEach(set => {
      expect(set.weightUnit).toBe('kg');
    });
  }, 60000);
});
