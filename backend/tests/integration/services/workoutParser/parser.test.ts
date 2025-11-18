import { Kysely } from 'kysely';
import { Database } from '../../../../src/db/types';
import { connect, closeDatabase, clearDatabase, getTestDb, seedExercises } from '../../../utils/testDb';
import { Parser } from '../../../../src/services/workoutParser/parser';
import { LLMService } from '../../../../src/services/llm.service';

describe('Parser - Integration Test', () => {
  let db: Kysely<Database>;
  let parser: Parser;
  let llmService: LLMService;
  let benchPressId: string;
  let squatId: string;
  let rowId: string;

  beforeAll(async () => {
    await connect();
    db = getTestDb();
    llmService = new LLMService();
    parser = new Parser(llmService);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    await seedExercises();

    // Get some exercise IDs for testing
    const benchPress = await db
      .selectFrom('exercises')
      .select('id')
      .where('name', 'ilike', '%bench press%')
      .where('name', 'ilike', '%barbell%')
      .executeTakeFirst();

    const squat = await db
      .selectFrom('exercises')
      .select('id')
      .where('name', 'ilike', '%squat%')
      .where('name', 'ilike', '%barbell%')
      .executeTakeFirst();

    const row = await db
      .selectFrom('exercises')
      .select('id')
      .where('name', 'ilike', '%row%')
      .where('name', 'ilike', '%barbell%')
      .executeTakeFirst();

    if (!benchPress || !squat || !row) {
      throw new Error('Required exercises not found in seed data');
    }

    benchPressId = String(benchPress.id);
    squatId = String(squat.id);
    rowId = String(row.id);
  });

  it('should parse simple workout with pre-mapped IDs', async () => {
    const workoutText = `
Bench Press 3x10
Squats 4x8
    `.trim();

    const exerciseIdMap = {
      'Bench Press': benchPressId,
      'Squats': squatId,
    };

    const result = await parser.parse(workoutText, exerciseIdMap);

    // Should have basic workout structure
    expect(result.name).toBeDefined();
    expect(result.date).toBeDefined();
    expect(result.lastModifiedTime).toBeDefined();
    expect(result.blocks).toBeDefined();
    expect(result.blocks.length).toBeGreaterThan(0);

    // Check exercises have the correct IDs
    const allExercises = result.blocks.flatMap(block => block.exercises);
    expect(allExercises.length).toBe(2);

    const exerciseIds = allExercises.map(ex => ex.exerciseId);
    expect(exerciseIds).toContain(benchPressId);
    expect(exerciseIds).toContain(squatId);

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

    const exerciseIdMap = {
      'Jumping jacks': benchPressId, // Just use any ID for testing
      'Bench Press': benchPressId,
      'Squats': squatId,
    };

    const result = await parser.parse(workoutText, exerciseIdMap);

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

    const exerciseIdMap = {
      'Bench Press': benchPressId,
      'Rows': rowId,
    };

    const result = await parser.parse(workoutText, exerciseIdMap);

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

    const exerciseIdMap = {
      'Squats': squatId,
    };

    const result = await parser.parse(workoutText, exerciseIdMap);

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

    const exerciseIdMap = {
      'Plank': benchPressId, // Use any ID for testing
    };

    const result = await parser.parse(workoutText, exerciseIdMap);

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

    const exerciseIdMap = {
      'Lunges': squatId, // Use any ID
    };

    const result = await parser.parse(workoutText, exerciseIdMap);

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

    const exerciseIdMap = {
      'Bench Press': benchPressId,
    };

    const customDate = '2024-12-25';
    const result = await parser.parse(workoutText, exerciseIdMap, { date: customDate });

    // Should use the custom date
    expect(result.date).toBe(customDate);
  }, 60000);

  it('should handle custom weightUnit option', async () => {
    const workoutText = `
Bench Press 3x10
    `.trim();

    const exerciseIdMap = {
      'Bench Press': benchPressId,
    };

    const result = await parser.parse(workoutText, exerciseIdMap, { weightUnit: 'kg' });

    // All sets should have the correct weightUnit
    const exercise = result.blocks[0].exercises[0];
    exercise.sets.forEach(set => {
      expect(set.weightUnit).toBe('kg');
    });
  }, 60000);
});
