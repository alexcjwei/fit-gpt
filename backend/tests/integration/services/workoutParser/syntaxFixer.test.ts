import { Kysely } from 'kysely';
import { Database } from '../../../../src/db/types';
import { connect, closeDatabase, clearDatabase, getTestDb, seedExercises } from '../../../utils/testDb';
import { createSyntaxFixer, type SyntaxFixer } from '../../../../src/services/workoutParser/syntaxFixer';
import { LLMService } from '../../../../src/services/llm.service';
import { WorkoutWithResolvedExercises } from '../../../../src/services/workoutParser/types';

describe('SyntaxFixer - Integration Test', () => {
  let db: Kysely<Database>;
  let syntaxFixer: SyntaxFixer;
  let llmService: LLMService;
  let benchPressId: string;

  beforeAll(async () => {
    await connect();
    db = getTestDb();
    llmService = new LLMService();
    syntaxFixer = createSyntaxFixer(llmService);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    await seedExercises();

    const benchPress = await db
      .selectFrom('exercises')
      .select('id')
      .where('name', 'ilike', '%bench press%')
      .where('name', 'ilike', '%barbell%')
      .executeTakeFirst();

    if (!benchPress) {
      throw new Error('Required exercise not found in seed data');
    }

    benchPressId = String(benchPress.id);
  });

  it('should fix missing required fields', async () => {
    const originalText = 'Bench Press 3x10';

    // Workout missing the name field
    const parsedWorkout: any = {
      // name is missing!
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          exercises: [
            {
              exerciseId: benchPressId,
              orderInBlock: 0,
              prescription: '3x10',
              sets: [
                { setNumber: 1, weightUnit: 'lbs' },
                { setNumber: 2, weightUnit: 'lbs' },
                { setNumber: 3, weightUnit: 'lbs' },
              ],
            },
          ],
        },
      ],
    };

    const result = await syntaxFixer.fix(originalText, parsedWorkout);

    // Should have added the missing name field
    expect(result.name).toBeDefined();
    expect(typeof result.name).toBe('string');
    expect(result.name.length).toBeGreaterThan(0);
  }, 60000);

  it('should fix invalid enum values', async () => {
    const originalText = 'Bench Press 3x10';

    // Workout with invalid weightUnit
    const parsedWorkout: any = {
      name: 'Test Workout',
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          exercises: [
            {
              exerciseId: benchPressId,
              orderInBlock: 0,
              prescription: '3x10',
              sets: [
                { setNumber: 1, weightUnit: 'pounds' }, // Invalid - should be 'lbs'
                { setNumber: 2, weightUnit: 'pounds' },
                { setNumber: 3, weightUnit: 'pounds' },
              ],
            },
          ],
        },
      ],
    };

    const result = await syntaxFixer.fix(originalText, parsedWorkout);

    // Should have corrected weightUnit to valid enum value
    const sets = result.blocks[0].exercises[0].sets;
    sets.forEach(set => {
      expect(['lbs', 'kg']).toContain(set.weightUnit);
    });
  }, 60000);

  it('should fix invalid data types', async () => {
    const originalText = 'Bench Press 3x10';

    // Workout with wrong data types
    const parsedWorkout: any = {
      name: 'Test Workout',
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          exercises: [
            {
              exerciseId: benchPressId,
              orderInBlock: 0,
              prescription: '3x10',
              sets: [
                { setNumber: '1', weightUnit: 'lbs' }, // String instead of number
                { setNumber: '2', weightUnit: 'lbs' },
                { setNumber: '3', weightUnit: 'lbs' },
              ],
            },
          ],
        },
      ],
    };

    const result = await syntaxFixer.fix(originalText, parsedWorkout);

    // Should have converted setNumbers to numbers
    const sets = result.blocks[0].exercises[0].sets;
    sets.forEach(set => {
      expect(typeof set.setNumber).toBe('number');
    });
  }, 60000);

  it('should pass through valid workout unchanged', async () => {
    const originalText = 'Bench Press 3x10';

    // Fully valid workout
    const parsedWorkout: WorkoutWithResolvedExercises = {
      name: 'Strength Training',
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          exercises: [
            {
              exerciseId: benchPressId,
              orderInBlock: 0,
              prescription: '3x10',
              sets: [
                { setNumber: 1, weightUnit: 'lbs' as const },
                { setNumber: 2, weightUnit: 'lbs' as const },
                { setNumber: 3, weightUnit: 'lbs' as const },
              ],
            },
          ],
        },
      ],
    };

    const result = await syntaxFixer.fix(originalText, parsedWorkout);

    // Should be essentially unchanged
    expect(result.name).toBe(parsedWorkout.name);
    expect(result.blocks.length).toBe(1);
    expect(result.blocks[0].exercises.length).toBe(1);
    expect(result.blocks[0].exercises[0].sets.length).toBe(3);
  }, 60000);

  it('should handle validation loop with multiple syntax errors', async () => {
    const originalText = 'Bench Press 3x10';

    // Multiple syntax errors
    const parsedWorkout: any = {
      // Missing name
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          exercises: [
            {
              exerciseId: benchPressId,
              orderInBlock: 0,
              prescription: '3x10',
              sets: [
                { setNumber: '1', weightUnit: 'pounds' }, // Wrong type AND wrong enum
                { setNumber: '2', weightUnit: 'pounds' },
                { setNumber: '3', weightUnit: 'pounds' },
              ],
            },
          ],
        },
      ],
    };

    const result = await syntaxFixer.fix(originalText, parsedWorkout);

    // All errors should be fixed
    expect(result.name).toBeDefined();
    expect(typeof result.name).toBe('string');

    const sets = result.blocks[0].exercises[0].sets;
    sets.forEach(set => {
      expect(typeof set.setNumber).toBe('number');
      expect(['lbs', 'kg']).toContain(set.weightUnit);
    });
  }, 60000);
});
