import { Kysely } from 'kysely';
import { Database } from '../../../../src/db/types';
import { connect, closeDatabase, clearDatabase, getTestDb, seedExercises } from '../../../utils/testDb';
import { SemanticFixer } from '../../../../src/services/workoutParser/semanticFixer';
import { LLMService } from '../../../../src/services/llm.service';
import { WorkoutWithResolvedExercises } from '../../../../src/services/workoutParser/types';

describe('SemanticFixer - Integration Test', () => {
  let db: Kysely<Database>;
  let semanticFixer: SemanticFixer;
  let llmService: LLMService;
  let benchPressId: string;
  let squatId: string;

  beforeAll(async () => {
    await connect();
    db = getTestDb();
    llmService = new LLMService();
    semanticFixer = new SemanticFixer(llmService);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    await seedExercises();

    // Get exercise IDs
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

    if (!benchPress || !squat) {
      throw new Error('Required exercises not found in seed data');
    }

    benchPressId = String(benchPress.id);
    squatId = String(squat.id);
  });

  it('should fix incorrectly parsed rep counts', async () => {
    const originalText = `
Bench Press 3x10
    `.trim();

    // Parsed workout with error - parsed as 100 sets instead of 3
    const parsedWorkout: WorkoutWithResolvedExercises = {
      name: 'Test Workout',
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          exercises: [
            {
              exerciseId: benchPressId,
              orderInBlock: 0,
              prescription: '100x10', // Wrong - should be 3x10
              sets: Array.from({ length: 100 }, (_, i) => ({
                setNumber: i + 1,
                weightUnit: 'lbs' as const,
              })),
            },
          ],
        },
      ],
    };

    const result = await semanticFixer.fix(originalText, parsedWorkout);

    // Should have corrected to 3 sets
    const exercise = result.blocks[0].exercises[0];
    expect(exercise.sets.length).toBe(3);
    expect(exercise.prescription).toContain('3');
  }, 60000);

  it('should fix superset set count mismatches', async () => {
    const originalText = `
Superset A:
1a. Bench Press 3x10
1b. Squats 3x10
    `.trim();

    // Parsed workout with mismatch - second exercise has wrong set count
    const parsedWorkout: WorkoutWithResolvedExercises = {
      name: 'Test Workout',
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          label: 'Superset A',
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
            {
              exerciseId: squatId,
              orderInBlock: 1,
              prescription: '5x10', // Wrong - should be 3x10
              sets: [
                { setNumber: 1, weightUnit: 'lbs' as const },
                { setNumber: 2, weightUnit: 'lbs' as const },
                { setNumber: 3, weightUnit: 'lbs' as const },
                { setNumber: 4, weightUnit: 'lbs' as const },
                { setNumber: 5, weightUnit: 'lbs' as const },
              ],
            },
          ],
        },
      ],
    };

    const result = await semanticFixer.fix(originalText, parsedWorkout);

    // Both exercises should have 3 sets
    const exercises = result.blocks[0].exercises;
    exercises.forEach(exercise => {
      expect(exercise.sets.length).toBe(3);
    });
  }, 60000);

  it('should pass through correctly parsed workout unchanged', async () => {
    const originalText = `
Bench Press 3x10
Squats 4x8
    `.trim();

    // Correctly parsed workout
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
            {
              exerciseId: squatId,
              orderInBlock: 1,
              prescription: '4x8',
              sets: [
                { setNumber: 1, weightUnit: 'lbs' as const },
                { setNumber: 2, weightUnit: 'lbs' as const },
                { setNumber: 3, weightUnit: 'lbs' as const },
                { setNumber: 4, weightUnit: 'lbs' as const },
              ],
            },
          ],
        },
      ],
    };

    const result = await semanticFixer.fix(originalText, parsedWorkout);

    // Should be unchanged
    expect(result.blocks.length).toBe(1);
    expect(result.blocks[0].exercises.length).toBe(2);
    expect(result.blocks[0].exercises[0].sets.length).toBe(3);
    expect(result.blocks[0].exercises[1].sets.length).toBe(4);
  }, 60000);

  it('should handle validation loop convergence with multiple errors', async () => {
    const originalText = `
Superset:
Bench Press 3x10
Squats 3x8
    `.trim();

    // Multiple errors: wrong set counts for both exercises
    const parsedWorkout: WorkoutWithResolvedExercises = {
      name: 'Test Workout',
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          label: 'Superset',
          exercises: [
            {
              exerciseId: benchPressId,
              orderInBlock: 0,
              prescription: '10x10', // Wrong - should be 3x10
              sets: Array.from({ length: 10 }, (_, i) => ({
                setNumber: i + 1,
                weightUnit: 'lbs' as const,
              })),
            },
            {
              exerciseId: squatId,
              orderInBlock: 1,
              prescription: '8x8', // Wrong - should be 3x8
              sets: Array.from({ length: 8 }, (_, i) => ({
                setNumber: i + 1,
                weightUnit: 'lbs' as const,
              })),
            },
          ],
        },
      ],
    };

    const result = await semanticFixer.fix(originalText, parsedWorkout);

    // Both should be corrected to 3 sets
    const exercises = result.blocks[0].exercises;
    expect(exercises[0].sets.length).toBe(3);
    expect(exercises[1].sets.length).toBe(3);
  }, 60000);
});
