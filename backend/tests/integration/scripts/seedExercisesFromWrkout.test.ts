import { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import {
  fetchExerciseList,
  fetchExerciseData,
  transformWrkoutExercise,
} from '../../../src/scripts/seedExercisesFromWrkout';
import { upsertExercises } from '../../../src/scripts/seedExercises';
import * as testDb from '../../utils/testDb';

/**
 * Integration tests for seedExercisesFromWrkout script
 * Tests the full workflow of fetching exercises from wrkout API and inserting them
 */
describe('seedExercisesFromWrkout integration', () => {
  let exerciseRepo: ExerciseRepository;

  // Setup: Connect to test database before all tests
  beforeAll(async () => {
    await testDb.connect();
    const db = testDb.getTestDb();
    exerciseRepo = new ExerciseRepository(db);
  });

  // Cleanup: Clear database after each test
  afterEach(async () => {
    await testDb.clearDatabase();
  });

  // Teardown: Close database connection after all tests
  afterAll(async () => {
    await testDb.closeDatabase();
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
    await upsertExercises(exercises);

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
    await upsertExercises(exercises);
    await upsertExercises(exercises);

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
