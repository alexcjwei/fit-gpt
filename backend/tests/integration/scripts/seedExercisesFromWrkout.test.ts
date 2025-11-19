import {
  fetchExerciseList,
  fetchExerciseData,
  transformWrkoutExercise,
  upsertExercises,
} from '../../../src/scripts/seedExercisesFromWrkout';
import { TestContainer } from '../../utils/testContainer';
import { createExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import type { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';

/**
 * Integration tests for seedExercisesFromWrkout script
 * Tests the full workflow of fetching exercises from wrkout API and inserting them
 */
describe('seedExercisesFromWrkout integration', () => {
  const testContainer = new TestContainer();
  let exerciseRepo: ExerciseRepository;
  let db: ReturnType<typeof testContainer.getDb>;

  // Setup: Start isolated container and connect to test database before all tests
  beforeAll(async () => {
    db = await testContainer.start();
    exerciseRepo = createExerciseRepository(db);
  });

  // Cleanup: Clear database after each test
  afterEach(async () => {
    await testContainer.clearDatabase();
  });

  // Teardown: Stop container and close database connection after all tests
  afterAll(async () => {
    await testContainer.stop();
  });

  it('should fetch, transform, and upsert first 50 exercises from wrkout API', async () => {
    // Fetch exercise list from GitHub API
    const exerciseNames = await fetchExerciseList();
    expect(exerciseNames.length).toBeGreaterThan(0);

    // Take first 50 exercises
    const first50 = exerciseNames.slice(0, 50);
    expect(first50.length).toBe(50);

    // Fetch and transform exercises
    const exercises = [];
    for (const exerciseName of first50) {
      try {
        const wrkoutExercise = await fetchExerciseData(exerciseName);
        const transformed = transformWrkoutExercise(wrkoutExercise);
        exercises.push(transformed);
      } catch (error) {
        console.error(`Error fetching exercise ${exerciseName}:`, error);
      }
    }

    // Should have successfully fetched most exercises
    expect(exercises.length).toBeGreaterThan(40);

    // Upsert exercises into database (this should not fail with duplicate key error)
    await upsertExercises(exercises, db);

    // Verify exercises were inserted
    const allExercises = await exerciseRepo.findAll();
    expect(allExercises.length).toBe(exercises.length);

    // Verify each exercise has unique tags (no duplicates in exercise_tags table)
    for (const exercise of allExercises) {
      const tags = exercise.tags || [];
      const uniqueTags = [...new Set(tags)];
      expect(tags.length).toBe(uniqueTags.length);
    }
  }, 60000); // Increase timeout to 60 seconds for API calls

  it('should handle upserting the same exercises twice without errors', async () => {
    // Fetch exercise list from GitHub API
    const exerciseNames = await fetchExerciseList();

    // Take first 10 exercises
    const first10 = exerciseNames.slice(0, 10);

    // Fetch and transform exercises
    const exercises = [];
    for (const exerciseName of first10) {
      try {
        const wrkoutExercise = await fetchExerciseData(exerciseName);
        const transformed = transformWrkoutExercise(wrkoutExercise);
        exercises.push(transformed);
      } catch (error) {
        console.error(`Error fetching exercise ${exerciseName}:`, error);
      }
    }

    // Upsert exercises twice
    await upsertExercises(exercises, db);
    await upsertExercises(exercises, db);

    // Verify only one copy of each exercise exists
    const allExercises = await exerciseRepo.findAll();
    expect(allExercises.length).toBe(exercises.length);

    // Verify each exercise has unique tags
    for (const exercise of allExercises) {
      const tags = exercise.tags || [];
      const uniqueTags = [...new Set(tags)];
      expect(tags.length).toBe(uniqueTags.length);
    }
  }, 30000); // Increase timeout to 30 seconds for API calls
});
