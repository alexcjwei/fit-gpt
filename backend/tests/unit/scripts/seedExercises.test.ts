import { Exercise } from '../../../src/models/Exercise';
import { upsertExercises, parseCsvLine, parseCsvToExercises, removeStaleExercises } from '../../../src/scripts/seedExercises';
import * as testDb from '../../utils/testDb';

/**
 * Unit tests for seedExercises script
 * Tests that the script correctly upserts exercises based on slug matching
 */
describe('seedExercises', () => {
  // Setup: Connect to in-memory database before all tests
  beforeAll(async () => {
    await testDb.connect();
  });

  // Cleanup: Clear database after each test
  afterEach(async () => {
    await testDb.clearDatabase();
  });

  // Teardown: Close database connection after all tests
  afterAll(async () => {
    await testDb.closeDatabase();
  });

  describe('upsert functionality', () => {
    it('should not delete existing exercises when upserting', async () => {
      // Create an exercise that's not in the seed data
      const customExercise = await Exercise.create({
        slug: 'custom-exercise',
        name: 'Custom Exercise',
        category: 'chest',
        primaryMuscles: ['chest'],
        equipment: ['bodyweight'],
      });

      // Upsert different exercises
      const exercises = [
        {
          slug: 'test-exercise',
          name: 'Test Exercise',
          category: 'chest',
          primaryMuscles: ['chest'],
          equipment: ['barbell'],
        },
      ];

      await upsertExercises(exercises);

      // Verify the custom exercise still exists
      const foundExercise = await Exercise.findOne({ slug: 'custom-exercise' });
      expect(foundExercise).toBeTruthy();
      expect(foundExercise?._id.toString()).toBe(customExercise._id.toString());
    });

    it('should update an existing exercise when slug matches', async () => {
      // Create an exercise
      const existingExercise = await Exercise.create({
        slug: 'test-exercise',
        name: 'Old Name',
        category: 'chest',
        primaryMuscles: ['chest'],
        equipment: ['barbell'],
        difficulty: 'beginner',
      });

      const originalId = existingExercise._id.toString();

      // Upsert with updated data
      const exercises = [
        {
          slug: 'test-exercise',
          name: 'Updated Name',
          category: 'chest',
          primaryMuscles: ['chest'],
          equipment: ['barbell'],
          difficulty: 'advanced',
        },
      ];

      await upsertExercises(exercises);

      // Verify the exercise was updated, not replaced
      const updatedExercise = await Exercise.findOne({ slug: 'test-exercise' });
      expect(updatedExercise).toBeTruthy();
      expect(updatedExercise?._id.toString()).toBe(originalId);
      expect(updatedExercise?.name).toBe('Updated Name');
      expect(updatedExercise?.difficulty).toBe('advanced');
    });

    it('should add new exercises', async () => {
      const initialCount = await Exercise.countDocuments();
      expect(initialCount).toBe(0);

      const exercises = [
        {
          slug: 'exercise1',
          name: 'Exercise 1',
          category: 'chest',
          primaryMuscles: ['chest'],
          equipment: ['barbell'],
        },
        {
          slug: 'exercise2',
          name: 'Exercise 2',
          category: 'back',
          primaryMuscles: ['back'],
          equipment: ['dumbbell'],
        },
      ];

      await upsertExercises(exercises);

      // Verify exercises were added
      const finalCount = await Exercise.countDocuments();
      expect(finalCount).toBe(2);

      const exercise1 = await Exercise.findOne({ slug: 'exercise1' });
      expect(exercise1?.name).toBe('Exercise 1');
    });

    it('should update multiple fields when exercise exists', async () => {
      // Create an exercise with outdated data
      await Exercise.create({
        slug: 'test-exercise',
        name: 'Outdated Name',
        category: 'chest',
        primaryMuscles: ['chest'],
        equipment: ['barbell'],
        difficulty: 'beginner',
        formCues: ['Old cue'],
        tags: ['old-tag'],
      });

      const exercises = [
        {
          slug: 'test-exercise',
          name: 'New Name',
          category: 'chest',
          primaryMuscles: ['chest'],
          secondaryMuscles: ['triceps', 'shoulders'],
          equipment: ['barbell', 'bench'],
          difficulty: 'advanced',
          formCues: ['Cue 1', 'Cue 2'],
          tags: ['tag1', 'tag2'],
        },
      ];

      await upsertExercises(exercises);

      // Verify multiple fields were updated
      const updatedExercise = await Exercise.findOne({ slug: 'test-exercise' });
      expect(updatedExercise?.name).toBe('New Name');
      expect(updatedExercise?.difficulty).toBe('advanced');
      expect(updatedExercise?.formCues).toContain('Cue 1');
      expect(updatedExercise?.tags).toContain('tag1');
      expect(updatedExercise?.secondaryMuscles).toContain('triceps');
    });

    it('should preserve exercises without slugs', async () => {
      // Create an exercise without a slug
      const exerciseWithoutSlug = await Exercise.create({
        name: 'Exercise Without Slug',
        category: 'chest',
        primaryMuscles: ['chest'],
        equipment: ['bodyweight'],
      });

      const exercises = [
        {
          slug: 'test-exercise',
          name: 'Test Exercise',
          category: 'chest',
          primaryMuscles: ['chest'],
          equipment: ['barbell'],
        },
      ];

      await upsertExercises(exercises);

      // Verify the exercise without slug still exists
      const foundExercise = await Exercise.findById(exerciseWithoutSlug._id);
      expect(foundExercise).toBeTruthy();
      expect(foundExercise?.name).toBe('Exercise Without Slug');
    });

    it('should handle upserting to empty database', async () => {
      const initialCount = await Exercise.countDocuments();
      expect(initialCount).toBe(0);

      const exercises = [
        {
          slug: 'test-exercise',
          name: 'Test Exercise',
          category: 'chest',
          primaryMuscles: ['chest'],
          equipment: ['barbell'],
        },
      ];

      await upsertExercises(exercises);

      // Verify exercises were added
      const finalCount = await Exercise.countDocuments();
      expect(finalCount).toBe(1);
    });

    it('should maintain unique slugs after upserting twice', async () => {
      const exercises = [
        {
          slug: 'test-exercise',
          name: 'Test Exercise',
          category: 'chest',
          primaryMuscles: ['chest'],
          equipment: ['barbell'],
        },
      ];

      // Upsert twice
      await upsertExercises(exercises);
      await upsertExercises(exercises);

      // Count exercises with a specific slug
      const count = await Exercise.countDocuments({ slug: 'test-exercise' });
      expect(count).toBe(1);
    });
  });

  describe('CSV parsing', () => {
    describe('parseCsvLine', () => {
      it('should parse a simple CSV line', () => {
        const line = 'value1,value2,value3';
        const result = parseCsvLine(line);
        expect(result).toEqual(['value1', 'value2', 'value3']);
      });

      it('should handle quoted values with commas', () => {
        const line = 'value1,"value2,with,commas",value3';
        const result = parseCsvLine(line);
        expect(result).toEqual(['value1', 'value2,with,commas', 'value3']);
      });

      it('should handle escaped quotes', () => {
        const line = 'value1,"value with ""quotes""",value3';
        const result = parseCsvLine(line);
        expect(result).toEqual(['value1', 'value with "quotes"', 'value3']);
      });

      it('should handle empty values', () => {
        const line = 'value1,,value3';
        const result = parseCsvLine(line);
        expect(result).toEqual(['value1', '', 'value3']);
      });
    });

    describe('parseCsvToExercises', () => {
      it('should parse CSV content to exercise objects', () => {
        const csv = `slug,name,category,primaryMuscles,equipment,difficulty,isCompound
test-exercise,Test Exercise,chest,chest,barbell;bench,intermediate,true`;

        const exercises = parseCsvToExercises(csv);

        expect(exercises).toHaveLength(1);
        expect(exercises[0]).toMatchObject({
          slug: 'test-exercise',
          name: 'Test Exercise',
          category: 'chest',
          primaryMuscles: ['chest'],
          equipment: ['barbell', 'bench'],
          difficulty: 'intermediate',
          isCompound: true,
        });
      });

      it('should handle semicolon-delimited array fields', () => {
        const csv = `slug,name,category,primaryMuscles,secondaryMuscles,equipment
test-exercise,Test Exercise,chest,chest;shoulders,triceps;biceps,barbell;dumbbell`;

        const exercises = parseCsvToExercises(csv);

        expect(exercises[0].primaryMuscles).toEqual(['chest', 'shoulders']);
        expect(exercises[0].secondaryMuscles).toEqual(['triceps', 'biceps']);
        expect(exercises[0].equipment).toEqual(['barbell', 'dumbbell']);
      });

      it('should handle boolean fields', () => {
        const csv = `slug,name,category,primaryMuscles,equipment,isUnilateral,isCompound
test1,Test 1,chest,chest,barbell,true,false
test2,Test 2,back,back,dumbbell,false,true`;

        const exercises = parseCsvToExercises(csv);

        expect(exercises[0].isUnilateral).toBe(true);
        expect(exercises[0].isCompound).toBe(false);
        expect(exercises[1].isUnilateral).toBe(false);
        expect(exercises[1].isCompound).toBe(true);
      });

      it('should skip empty values', () => {
        const csv = `slug,name,category,primaryMuscles,equipment,difficulty
test-exercise,Test Exercise,chest,chest,barbell,`;

        const exercises = parseCsvToExercises(csv);

        expect(exercises[0]).toMatchObject({
          slug: 'test-exercise',
          name: 'Test Exercise',
          category: 'chest',
        });
        expect(exercises[0].difficulty).toBeUndefined();
      });
    });
  });

  describe('removeStaleExercises', () => {
    it('should remove exercises with slugs not in the current CSV', async () => {
      // Create exercises that were previously in CSV
      await Exercise.create({
        slug: 'old-exercise-1',
        name: 'Old Exercise 1',
        category: 'chest',
        primaryMuscles: ['chest'],
        equipment: ['barbell'],
      });

      await Exercise.create({
        slug: 'old-exercise-2',
        name: 'Old Exercise 2',
        category: 'back',
        primaryMuscles: ['back'],
        equipment: ['dumbbell'],
      });

      // Current CSV only has one exercise
      const currentSlugs = ['old-exercise-1'];

      const result = await removeStaleExercises(currentSlugs);

      // Verify one exercise was deleted
      expect(result.deletedCount).toBe(1);

      // Verify the correct exercise still exists
      const remainingExercise = await Exercise.findOne({ slug: 'old-exercise-1' });
      expect(remainingExercise).toBeTruthy();

      // Verify the stale exercise was removed
      const deletedExercise = await Exercise.findOne({ slug: 'old-exercise-2' });
      expect(deletedExercise).toBeNull();
    });

    it('should preserve exercises without slugs (custom exercises)', async () => {
      // Create a custom exercise without a slug
      const customExercise = await Exercise.create({
        name: 'Custom Exercise',
        category: 'chest',
        primaryMuscles: ['chest'],
        equipment: ['bodyweight'],
      });

      // Create an exercise with a slug that's not in CSV
      await Exercise.create({
        slug: 'stale-exercise',
        name: 'Stale Exercise',
        category: 'back',
        primaryMuscles: ['back'],
        equipment: ['barbell'],
      });

      // Current CSV has no exercises
      const currentSlugs: string[] = [];

      const result = await removeStaleExercises(currentSlugs);

      // Verify only the stale exercise was deleted
      expect(result.deletedCount).toBe(1);

      // Verify custom exercise still exists
      const foundCustom = await Exercise.findById(customExercise._id);
      expect(foundCustom).toBeTruthy();
      expect(foundCustom?.name).toBe('Custom Exercise');
    });

    it('should not delete anything when all exercises are in current CSV', async () => {
      // Create exercises
      await Exercise.create({
        slug: 'exercise-1',
        name: 'Exercise 1',
        category: 'chest',
        primaryMuscles: ['chest'],
        equipment: ['barbell'],
      });

      await Exercise.create({
        slug: 'exercise-2',
        name: 'Exercise 2',
        category: 'back',
        primaryMuscles: ['back'],
        equipment: ['dumbbell'],
      });

      // Current CSV has both exercises
      const currentSlugs = ['exercise-1', 'exercise-2'];

      const result = await removeStaleExercises(currentSlugs);

      // Verify nothing was deleted
      expect(result.deletedCount).toBe(0);

      // Verify both exercises still exist
      const count = await Exercise.countDocuments();
      expect(count).toBe(2);
    });

    it('should handle empty database', async () => {
      const currentSlugs = ['exercise-1', 'exercise-2'];

      const result = await removeStaleExercises(currentSlugs);

      // Verify nothing was deleted
      expect(result.deletedCount).toBe(0);
    });

    it('should remove multiple stale exercises at once', async () => {
      // Create exercises
      await Exercise.create({
        slug: 'keep-this',
        name: 'Keep This',
        category: 'chest',
        primaryMuscles: ['chest'],
        equipment: ['barbell'],
      });

      await Exercise.create({
        slug: 'remove-1',
        name: 'Remove 1',
        category: 'back',
        primaryMuscles: ['back'],
        equipment: ['barbell'],
      });

      await Exercise.create({
        slug: 'remove-2',
        name: 'Remove 2',
        category: 'legs',
        primaryMuscles: ['quads'],
        equipment: ['barbell'],
      });

      await Exercise.create({
        slug: 'remove-3',
        name: 'Remove 3',
        category: 'shoulders',
        primaryMuscles: ['shoulders'],
        equipment: ['dumbbell'],
      });

      // Current CSV only has one exercise
      const currentSlugs = ['keep-this'];

      const result = await removeStaleExercises(currentSlugs);

      // Verify three exercises were deleted
      expect(result.deletedCount).toBe(3);

      // Verify only the correct exercise remains
      const count = await Exercise.countDocuments();
      expect(count).toBe(1);

      const remaining = await Exercise.findOne({ slug: 'keep-this' });
      expect(remaining).toBeTruthy();
    });
  });
});
