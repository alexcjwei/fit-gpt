import { TestContainer } from '../../../utils/testContainer';
import { createIDExtractor } from '../../../../src/services/workoutParser/idExtractor';
import { LLMService } from '../../../../src/services/llm.service';
import { createExerciseSearchService } from '../../../../src/services/exerciseSearch.service';
import { createExerciseCreationService } from '../../../../src/services/exerciseCreation.service';
import { createExerciseRepository } from '../../../../src/repositories/ExerciseRepository';
import { createEmbeddingService } from '../../../../src/services/embedding.service';
import type { WorkoutWithPlaceholders } from '../../../../src/types';

/**
 * ID Extractor Integration Test
 *
 * Tests the resolveIds method to ensure it correctly maps exercise names
 * in a parsed workout to appropriate exercise IDs in the database.
 */
describe('IDExtractor - resolveIds', () => {
  const testContainer = new TestContainer();
  let idExtractor: ReturnType<typeof createIDExtractor>;
  let exerciseRepository: ReturnType<typeof createExerciseRepository>;

  beforeAll(async () => {
    const db = await testContainer.start();
    exerciseRepository = createExerciseRepository(db);
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

  it('should resolve exercise names in parsed workout to database IDs', async () => {
    // Create a mock parsed workout with exerciseNames
    const parsedWorkout: WorkoutWithPlaceholders = {
      name: 'Strength Training - November 15, 2024',
      date: '2024-11-15',
      lastModifiedTime: '2024-11-15T12:00:00Z',
      notes: '',
      blocks: [
        {
          label: '',
          notes: '',
          exercises: [
            {
              exerciseName: 'Barbell Bench Press',
              orderInBlock: 0,
              prescription: '3 x 8',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 2, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 3, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
            {
              exerciseName: 'Barbell Squat',
              orderInBlock: 1,
              prescription: '5 x 5',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 2, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 3, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 4, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 5, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
            {
              exerciseName: 'Deadlift',
              orderInBlock: 2,
              prescription: '3 x 5',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 2, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 3, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
            {
              exerciseName: 'Pull-ups',
              orderInBlock: 3,
              prescription: '4 sets',
              notes: 'to failure',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 2, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 3, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 4, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
          ],
        },
      ],
    };

    const result = await idExtractor.resolveIds(parsedWorkout);

    // Verify structure is preserved
    expect(result.name).toBe('Strength Training - November 15, 2024');
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].exercises).toHaveLength(4);

    // Verify exercises have exerciseId instead of exerciseName
    const exercises = result.blocks[0].exercises;
    exercises.forEach((exercise) => {
      expect(exercise.exerciseId).toBeDefined();
      expect(exercise.exerciseId).not.toBe('');
      // Verify it looks like a UUID (database ID)
      expect(typeof exercise.exerciseId).toBe('string');
    });

    // Verify all exercise IDs are resolved to actual database IDs
    for (const exercise of exercises) {
      const dbExercise = await exerciseRepository.findById(exercise.exerciseId);
      expect(dbExercise).toBeDefined();
    }
  }, 120000);
});
