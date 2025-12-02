import { TestContainer } from '../../utils/testContainer';
import { createExerciseCreationService } from '../../../src/services/exerciseCreation.service';
import { createExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import { LLMService } from '../../../src/services/llm.service';
import { createEmbeddingService } from '../../../src/services/embedding.service';

/**
 * Integration tests for ExerciseCreationService
 * Tests exercise creation with real database and embedding generation
 */
describe('ExerciseCreationService', () => {
  const testContainer = new TestContainer();
  let creationService: ReturnType<typeof createExerciseCreationService>;
  let exerciseRepository: ReturnType<typeof createExerciseRepository>;

  beforeAll(async () => {
    const db = await testContainer.start();
    exerciseRepository = createExerciseRepository(db);
    const llmService = new LLMService();
    const embeddingService = createEmbeddingService();
    creationService = createExerciseCreationService(exerciseRepository, llmService, embeddingService);
  });

  afterAll(async () => {
    await testContainer.stop();
  });

  beforeEach(async () => {
    await testContainer.clearDatabase();
  });

  describe('getOrCreateExerciseByName', () => {
    it('should create a new exercise when slug does not exist', async () => {
      const exerciseName = 'Bulgarian Split Squat';

      const exercise = await creationService.getOrCreateExerciseByName(exerciseName);

      // Verify exercise was created
      expect(exercise).toBeDefined();
      expect(exercise.id).toBeDefined();
      expect(exercise.name).toBe(exerciseName);
      expect(exercise.slug).toBe('bulgarian-split-squat');
      expect(exercise.needsReview).toBe(true);

      // Verify it's in the database
      const dbExercise = await exerciseRepository.findById(exercise.id);
      expect(dbExercise).toBeDefined();
      expect(dbExercise?.name).toBe(exerciseName);
    }, 30000);

    it('should return existing exercise when slug already exists (idempotent)', async () => {
      const exerciseName = 'Bench Press';

      // First call - creates exercise
      const firstExercise = await creationService.getOrCreateExerciseByName(exerciseName);
      expect(firstExercise).toBeDefined();
      expect(firstExercise.id).toBeDefined();

      // Second call with same name - should return existing exercise
      const secondExercise = await creationService.getOrCreateExerciseByName(exerciseName);
      expect(secondExercise).toBeDefined();
      expect(secondExercise.id).toBe(firstExercise.id);
      expect(secondExercise.name).toBe(exerciseName);
      expect(secondExercise.slug).toBe('bench-press');

      // Verify only one exercise was created
      const allExercises = await exerciseRepository.findAll();
      expect(allExercises.length).toBe(1);
    }, 30000);

    it('should return existing exercise when exercise name normalizes to same slug', async () => {
      // Create with one variation
      const firstExercise = await creationService.getOrCreateExerciseByName('Bench Press');
      expect(firstExercise).toBeDefined();

      // Create with different casing/spacing - should return same exercise
      const secondExercise = await creationService.getOrCreateExerciseByName('bench press');
      expect(secondExercise.id).toBe(firstExercise.id);

      const thirdExercise = await creationService.getOrCreateExerciseByName('BENCH  PRESS');
      expect(thirdExercise.id).toBe(firstExercise.id);

      // Verify only one exercise was created
      const allExercises = await exerciseRepository.findAll();
      expect(allExercises.length).toBe(1);
    }, 30000);

    it('should handle concurrent creates of same exercise name (race condition)', async () => {
      const exerciseName = 'Squat';

      // Simulate concurrent creation attempts
      const promises = Array(5).fill(null).map(() =>
        creationService.getOrCreateExerciseByName(exerciseName)
      );

      const exercises = await Promise.all(promises);

      // All should return the same exercise ID
      const uniqueIds = new Set(exercises.map(e => e.id));
      expect(uniqueIds.size).toBe(1);

      // Verify only one exercise was created
      const allExercises = await exerciseRepository.findAll();
      expect(allExercises.length).toBe(1);
      expect(allExercises[0].name).toBe(exerciseName);
    }, 30000);

    it('should handle concurrent creates of different exercise names that normalize to same slug', async () => {
      // These all normalize to "pull-up" (only differ in casing and special chars)
      const variations = ['Pull-Up', 'pull-up', 'PULL-UP', 'Pull-up', 'pull-UP'];

      // Simulate concurrent creation attempts
      const promises = variations.map(name =>
        creationService.getOrCreateExerciseByName(name)
      );

      const exercises = await Promise.all(promises);

      // All should return the same exercise ID
      const uniqueIds = new Set(exercises.map(e => e.id));
      expect(uniqueIds.size).toBe(1);

      // Verify only one exercise was created
      const allExercises = await exerciseRepository.findAll();
      expect(allExercises.length).toBe(1);
      expect(allExercises[0].slug).toBe('pull-up');
    }, 30000);

    it('should generate embeddings for created exercises', async () => {
      const exerciseName = 'Romanian Deadlift';

      const exercise = await creationService.getOrCreateExerciseByName(exerciseName);

      // Verify exercise has embedding
      const dbExercises = await exerciseRepository.findAllWithEmbeddings();
      const createdExercise = dbExercises.find(e => e.id === exercise.id);

      expect(createdExercise).toBeDefined();
      expect(createdExercise?.name_embedding).toBeDefined();
      expect(Array.isArray(createdExercise?.name_embedding)).toBe(true);
      expect(createdExercise?.name_embedding?.length).toBe(1536);
    }, 30000);
  });
});
