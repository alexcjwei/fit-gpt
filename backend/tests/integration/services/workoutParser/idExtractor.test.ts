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
    idExtractor = createIDExtractor(llmService, searchService, creationService, exerciseRepository);
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

  it('should resolve "Brisk Walk" to "Walk" exercise', async () => {
    // Create "Walk" exercise in database
    const walkExercise = await exerciseRepository.create({
      slug: 'walk',
      name: 'Walk',
      tags: ['cardio'],
    });

    // Create a workout with "Brisk Walk"
    const parsedWorkout: WorkoutWithPlaceholders = {
      name: 'Cardio Session',
      date: '2024-11-16',
      lastModifiedTime: '2024-11-16T12:00:00Z',
      notes: '',
      blocks: [
        {
          label: '',
          notes: '',
          exercises: [
            {
              exerciseName: 'Brisk Walk',
              orderInBlock: 0,
              prescription: '30 min',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: 30, rpe: null, notes: '' },
              ],
            },
          ],
        },
      ],
    };

    const result = await idExtractor.resolveIds(parsedWorkout);

    // Verify "Brisk Walk" was resolved to "Walk" exercise
    expect(result.blocks[0].exercises).toHaveLength(1);
    const resolvedExercise = result.blocks[0].exercises[0];
    expect(resolvedExercise.exerciseId).toBe(walkExercise.id);

    // Verify the exercise in DB is "Walk"
    const dbExercise = await exerciseRepository.findById(resolvedExercise.exerciseId);
    expect(dbExercise).toBeDefined();
    expect(dbExercise?.slug).toBe('walk');
    expect(dbExercise?.name).toBe('Walk');
  }, 120000);

  it('should create new exercise without AI when no trigram results found', async () => {
    // Use a completely unique exercise name that won't match anything
    const uniqueExerciseName = 'ZzXxYy_UniqueExercise_12345';

    // Create a workout with this unique exercise
    const parsedWorkout: WorkoutWithPlaceholders = {
      name: 'Test Workout',
      date: '2024-11-17',
      lastModifiedTime: '2024-11-17T12:00:00Z',
      notes: '',
      blocks: [
        {
          label: '',
          notes: '',
          exercises: [
            {
              exerciseName: uniqueExerciseName,
              orderInBlock: 0,
              prescription: '3 x 10',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 2, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
                { setNumber: 3, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
          ],
        },
      ],
    };

    const result = await idExtractor.resolveIds(parsedWorkout);

    // Verify exercise was created
    expect(result.blocks[0].exercises).toHaveLength(1);
    const resolvedExercise = result.blocks[0].exercises[0];
    expect(resolvedExercise.exerciseId).toBeDefined();

    // Verify the created exercise exists in DB
    const dbExercise = await exerciseRepository.findById(resolvedExercise.exerciseId);
    expect(dbExercise).toBeDefined();
    expect(dbExercise?.name).toBeDefined(); // Name may be normalized
    expect(dbExercise?.needsReview).toBe(true); // Should be flagged for review
  }, 120000);

  it('should deduplicate exercise names with different casing', async () => {
    // Create a workout with duplicate exercise names (different casing)
    const parsedWorkout: WorkoutWithPlaceholders = {
      name: 'Dedup Test Workout',
      date: '2024-11-18',
      lastModifiedTime: '2024-11-18T12:00:00Z',
      notes: '',
      blocks: [
        {
          label: '',
          notes: '',
          exercises: [
            {
              exerciseName: 'Bench Press',
              orderInBlock: 0,
              prescription: '3 x 8',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
            {
              exerciseName: 'bench press',
              orderInBlock: 1,
              prescription: '3 x 8',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
            {
              exerciseName: 'BENCH PRESS',
              orderInBlock: 2,
              prescription: '3 x 8',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
          ],
        },
      ],
    };

    const result = await idExtractor.resolveIds(parsedWorkout);

    // All three exercises should have the same exerciseId
    const exercises = result.blocks[0].exercises;
    expect(exercises).toHaveLength(3);
    expect(exercises[0].exerciseId).toBe(exercises[1].exerciseId);
    expect(exercises[0].exerciseId).toBe(exercises[2].exerciseId);

    // Only one exercise should be created in the database
    const allExercises = await exerciseRepository.findAll();
    const benchPressExercises = allExercises.filter(e => e.slug === 'bench-press');
    expect(benchPressExercises.length).toBe(1);
  }, 120000);

  it('should deduplicate exercise names with different whitespace/punctuation', async () => {
    // Use unique exercise names to avoid matching seeded exercises
    const uniqueExercise1 = 'ZzUnique-Exercise';
    const uniqueExercise2 = 'zzunique-exercise';
    const uniqueExercise3 = 'ZzUnique Exercise';

    // Create a workout with duplicate exercise names (different spacing/punctuation)
    const parsedWorkout: WorkoutWithPlaceholders = {
      name: 'Dedup Whitespace Test',
      date: '2024-11-18',
      lastModifiedTime: '2024-11-18T12:00:00Z',
      notes: '',
      blocks: [
        {
          label: '',
          notes: '',
          exercises: [
            {
              exerciseName: uniqueExercise1,
              orderInBlock: 0,
              prescription: '4 x 10',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
            {
              exerciseName: uniqueExercise2,
              orderInBlock: 1,
              prescription: '4 x 10',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
            {
              exerciseName: uniqueExercise3,
              orderInBlock: 2,
              prescription: '4 x 10',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
          ],
        },
      ],
    };

    const result = await idExtractor.resolveIds(parsedWorkout);

    // All three exercises should have the same exerciseId
    const exercises = result.blocks[0].exercises;
    expect(exercises).toHaveLength(3);
    expect(exercises[0].exerciseId).toBe(exercises[1].exerciseId);
    expect(exercises[0].exerciseId).toBe(exercises[2].exerciseId);

    // Verify only one exercise was created with the normalized slug
    const allExercises = await exerciseRepository.findAll();
    const matchingExercises = allExercises.filter(e => e.slug === 'zzunique-exercise');
    expect(matchingExercises.length).toBe(1);
  }, 120000);

  it('should use first exercise name encountered when creating deduplicated exercise', async () => {
    const uniqueExerciseName1 = 'ZzTest Exercise One';
    const uniqueExerciseName2 = 'zztest exercise one'; // Same slug
    const uniqueExerciseName3 = 'ZZTEST EXERCISE ONE'; // Same slug

    const parsedWorkout: WorkoutWithPlaceholders = {
      name: 'First Name Test',
      date: '2024-11-18',
      lastModifiedTime: '2024-11-18T12:00:00Z',
      notes: '',
      blocks: [
        {
          label: '',
          notes: '',
          exercises: [
            {
              exerciseName: uniqueExerciseName1,
              orderInBlock: 0,
              prescription: '3 x 10',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
            {
              exerciseName: uniqueExerciseName2,
              orderInBlock: 1,
              prescription: '3 x 10',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
            {
              exerciseName: uniqueExerciseName3,
              orderInBlock: 2,
              prescription: '3 x 10',
              notes: '',
              sets: [
                { setNumber: 1, reps: null, weight: null, weightUnit: 'lbs', duration: null, rpe: null, notes: '' },
              ],
            },
          ],
        },
      ],
    };

    const result = await idExtractor.resolveIds(parsedWorkout);

    // All should have the same ID
    const exercises = result.blocks[0].exercises;
    expect(exercises[0].exerciseId).toBe(exercises[1].exerciseId);
    expect(exercises[0].exerciseId).toBe(exercises[2].exerciseId);

    // The created exercise should use the first name encountered
    const dbExercise = await exerciseRepository.findById(exercises[0].exerciseId);
    expect(dbExercise).toBeDefined();
    expect(dbExercise?.name).toBe(uniqueExerciseName1);
  }, 120000);
});
