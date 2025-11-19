import { Kysely } from 'kysely';
import { Database } from '../../../src/db/types';
import { createExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import { TestContainer } from '../../utils/testContainer';

describe('ExerciseRepository', () => {
  const testContainer = new TestContainer();
  let db: Kysely<Database>;
  let exerciseRepository: ReturnType<typeof createExerciseRepository>;

  beforeAll(async () => {
    db = await testContainer.start();
    exerciseRepository = createExerciseRepository(db);
  });

  afterAll(async () => {
    await testContainer.stop();
  });

  beforeEach(async () => {
    await testContainer.clearDatabase();
  });

  describe('create', () => {
    it('should create exercise with tags', async () => {
      const exerciseData = {
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell', 'compound'],
        needsReview: false,
      };

      const exercise = await exerciseRepository.create(exerciseData);

      expect(exercise).toBeDefined();
      expect(exercise.id).toBeDefined();
      expect(exercise.slug).toBe('barbell-bench-press');
      expect(exercise.name).toBe('Barbell Bench Press');
      expect(exercise.tags).toEqual(['chest', 'push', 'barbell', 'compound']);
      expect(exercise.needsReview).toBe(false);
    });

    it('should create exercise without tags', async () => {
      const exerciseData = {
        slug: 'custom-exercise',
        name: 'Custom Exercise',
      };

      const exercise = await exerciseRepository.create(exerciseData);

      expect(exercise).toBeDefined();
      expect(exercise.tags).toEqual([]);
      expect(exercise.needsReview).toBe(false); // Default value
    });

    it('should create exercise with needsReview flag', async () => {
      const exerciseData = {
        slug: 'llm-generated-exercise',
        name: 'LLM Generated Exercise',
        needsReview: true,
      };

      const exercise = await exerciseRepository.create(exerciseData);

      expect(exercise.needsReview).toBe(true);
    });

    it('should throw error for duplicate slug', async () => {
      const exerciseData = {
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
      };

      await exerciseRepository.create(exerciseData);

      // Attempt to create exercise with same slug
      await expect(exerciseRepository.create(exerciseData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find exercise by ID with tags', async () => {
      const created = await exerciseRepository.create({
        slug: 'barbell-squat',
        name: 'Barbell Squat',
        tags: ['legs', 'squat', 'barbell'],
      });

      const found = await exerciseRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.slug).toBe('barbell-squat');
      expect(found?.name).toBe('Barbell Squat');
      expect(found?.tags).toEqual(['legs', 'squat', 'barbell']);
    });

    it('should return null for non-existent ID', async () => {
      const found = await exerciseRepository.findById('999999');

      expect(found).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find exercise by slug with tags', async () => {
      await exerciseRepository.create({
        slug: 'barbell-deadlift',
        name: 'Barbell Deadlift',
        tags: ['legs', 'back', 'barbell'],
      });

      const found = await exerciseRepository.findBySlug('barbell-deadlift');

      expect(found).toBeDefined();
      expect(found?.slug).toBe('barbell-deadlift');
      expect(found?.name).toBe('Barbell Deadlift');
      expect(found?.tags).toEqual(['legs', 'back', 'barbell']);
    });

    it('should return null for non-existent slug', async () => {
      const found = await exerciseRepository.findBySlug('non-existent-slug');

      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test exercises
      await exerciseRepository.create({
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell'],
        needsReview: false,
      });
      await exerciseRepository.create({
        slug: 'barbell-squat',
        name: 'Barbell Squat',
        tags: ['legs', 'squat', 'barbell'],
        needsReview: false,
      });
      await exerciseRepository.create({
        slug: 'llm-generated',
        name: 'LLM Generated Exercise',
        tags: ['chest'],
        needsReview: true,
      });
    });

    it('should return all exercises', async () => {
      const exercises = await exerciseRepository.findAll();

      expect(exercises).toHaveLength(3);
    });

    it('should filter by needsReview', async () => {
      const exercises = await exerciseRepository.findAll({ needsReview: true });

      expect(exercises).toHaveLength(1);
      expect(exercises[0].name).toBe('LLM Generated Exercise');
    });

    it('should filter by name query (case-insensitive)', async () => {
      const exercises = await exerciseRepository.findAll({ nameQuery: 'barbell' });

      expect(exercises).toHaveLength(2);
      expect(exercises.every((e) => e.name.toLowerCase().includes('barbell'))).toBe(true);
    });

    it('should filter by tags (OR logic)', async () => {
      const exercises = await exerciseRepository.findAll({ tags: ['chest'] });

      expect(exercises).toHaveLength(2);
      expect(exercises.every((e) => e.tags?.includes('chest'))).toBe(true);
    });

    it('should filter by multiple tags (OR logic)', async () => {
      const exercises = await exerciseRepository.findAll({ tags: ['chest', 'legs'] });

      expect(exercises).toHaveLength(3);
    });

    it('should return empty array when no exercises match', async () => {
      const exercises = await exerciseRepository.findAll({ tags: ['nonexistent'] });

      expect(exercises).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update exercise name', async () => {
      const created = await exerciseRepository.create({
        slug: 'bench-press',
        name: 'Bench Press',
        tags: ['chest'],
      });

      const updated = await exerciseRepository.update(created.id, {
        name: 'Barbell Bench Press',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Barbell Bench Press');
      expect(updated?.slug).toBe('bench-press'); // Unchanged
      expect(updated?.tags).toEqual(['chest']); // Unchanged
    });

    it('should update exercise slug', async () => {
      const created = await exerciseRepository.create({
        slug: 'bench-press',
        name: 'Bench Press',
      });

      const updated = await exerciseRepository.update(created.id, {
        slug: 'barbell-bench-press',
      });

      expect(updated?.slug).toBe('barbell-bench-press');
    });

    it('should update exercise tags', async () => {
      const created = await exerciseRepository.create({
        slug: 'bench-press',
        name: 'Bench Press',
        tags: ['chest'],
      });

      const updated = await exerciseRepository.update(created.id, {
        tags: ['chest', 'push', 'barbell'],
      });

      expect(updated?.tags).toEqual(['chest', 'push', 'barbell']);
    });

    it('should remove all tags when updated with empty array', async () => {
      const created = await exerciseRepository.create({
        slug: 'bench-press',
        name: 'Bench Press',
        tags: ['chest', 'push'],
      });

      const updated = await exerciseRepository.update(created.id, {
        tags: [],
      });

      expect(updated?.tags).toEqual([]);
    });

    it('should update needsReview flag', async () => {
      const created = await exerciseRepository.create({
        slug: 'bench-press',
        name: 'Bench Press',
        needsReview: true,
      });

      const updated = await exerciseRepository.update(created.id, {
        needsReview: false,
      });

      expect(updated?.needsReview).toBe(false);
    });

    it('should update multiple fields at once', async () => {
      const created = await exerciseRepository.create({
        slug: 'bench-press',
        name: 'Bench Press',
        tags: ['chest'],
      });

      const updated = await exerciseRepository.update(created.id, {
        name: 'Barbell Bench Press',
        slug: 'barbell-bench-press',
        tags: ['chest', 'push', 'barbell'],
      });

      expect(updated?.name).toBe('Barbell Bench Press');
      expect(updated?.slug).toBe('barbell-bench-press');
      expect(updated?.tags).toEqual(['chest', 'push', 'barbell']);
    });

    it('should return null for non-existent ID', async () => {
      const updated = await exerciseRepository.update('999999', {
        name: 'Updated Name',
      });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete exercise by ID', async () => {
      const created = await exerciseRepository.create({
        slug: 'bench-press',
        name: 'Bench Press',
        tags: ['chest'],
      });

      const deleted = await exerciseRepository.delete(created.id);

      expect(deleted).toBe(true);

      // Verify exercise is deleted
      const found = await exerciseRepository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should cascade delete tags', async () => {
      const created = await exerciseRepository.create({
        slug: 'bench-press',
        name: 'Bench Press',
        tags: ['chest', 'push'],
      });

      await exerciseRepository.delete(created.id);

      // Verify tags are also deleted
      const tagRows = await db
        .selectFrom('exercise_tags')
        .selectAll()
        .where('exercise_id', '=', BigInt(created.id))
        .execute();

      expect(tagRows).toHaveLength(0);
    });

    it('should return false for non-existent ID', async () => {
      const deleted = await exerciseRepository.delete('999999');

      expect(deleted).toBe(false);
    });
  });

  describe('searchByName', () => {
    beforeEach(async () => {
      await exerciseRepository.create({
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest'],
      });
      await exerciseRepository.create({
        slug: 'dumbbell-bench-press',
        name: 'Dumbbell Bench Press',
        tags: ['chest'],
      });
      await exerciseRepository.create({
        slug: 'incline-bench-press',
        name: 'Incline Bench Press',
        tags: ['chest'],
      });
      await exerciseRepository.create({
        slug: 'barbell-squat',
        name: 'Barbell Squat',
        tags: ['legs'],
      });
    });

    it('should search exercises by similarity', async () => {
      const results = await exerciseRepository.searchByName('bench');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((e) => e.name.toLowerCase().includes('bench'))).toBe(true);
    });

    it('should order results by similarity', async () => {
      const results = await exerciseRepository.searchByName('Barbell Bench');

      // First result should be most similar
      expect(results[0].name).toBe('Barbell Bench Press');
    });

    it('should respect limit parameter', async () => {
      const results = await exerciseRepository.searchByName('bench', 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should include tags in results', async () => {
      const results = await exerciseRepository.searchByName('bench');

      expect(results[0].tags).toBeDefined();
      expect(Array.isArray(results[0].tags)).toBe(true);
    });
  });

  describe('findByTag', () => {
    beforeEach(async () => {
      await exerciseRepository.create({
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell'],
      });
      await exerciseRepository.create({
        slug: 'barbell-squat',
        name: 'Barbell Squat',
        tags: ['legs', 'squat', 'barbell'],
      });
      await exerciseRepository.create({
        slug: 'push-up',
        name: 'Push Up',
        tags: ['chest', 'push', 'bodyweight'],
      });
    });

    it('should find exercises by tag', async () => {
      const exercises = await exerciseRepository.findByTag('barbell');

      expect(exercises).toHaveLength(2);
      expect(exercises.every((e) => e.tags?.includes('barbell'))).toBe(true);
    });

    it('should include all tags for each exercise', async () => {
      const exercises = await exerciseRepository.findByTag('chest');

      expect(exercises).toHaveLength(2);
      expect(exercises[0].tags?.length).toBeGreaterThan(1);
    });

    it('should return empty array for non-existent tag', async () => {
      const exercises = await exerciseRepository.findByTag('nonexistent');

      expect(exercises).toEqual([]);
    });
  });

  describe('checkDuplicateName', () => {
    beforeEach(async () => {
      await exerciseRepository.create({
        slug: 'bench-press',
        name: 'Bench Press',
      });
    });

    it('should return true if duplicate exists', async () => {
      const isDuplicate = await exerciseRepository.checkDuplicateName('Bench Press');

      expect(isDuplicate).toBe(true);
    });

    it('should return false if no duplicate exists', async () => {
      const isDuplicate = await exerciseRepository.checkDuplicateName('Squat');

      expect(isDuplicate).toBe(false);
    });

    it('should exclude specified ID from check', async () => {
      const created = await exerciseRepository.create({
        slug: 'squat',
        name: 'Squat',
      });

      // Should return false when excluding the exercise's own ID
      const isDuplicate = await exerciseRepository.checkDuplicateName('Squat', created.id);

      expect(isDuplicate).toBe(false);
    });
  });

  describe('existsById', () => {
    it('should return true if exercise exists', async () => {
      const created = await exerciseRepository.create({
        slug: 'bench-press',
        name: 'Bench Press',
      });

      const exists = await exerciseRepository.existsById(created.id);

      expect(exists).toBe(true);
    });

    it('should return false if exercise does not exist', async () => {
      const exists = await exerciseRepository.existsById('999999');

      expect(exists).toBe(false);
    });
  });

  describe('existsBySlug', () => {
    it('should return true if exercise exists', async () => {
      await exerciseRepository.create({
        slug: 'bench-press',
        name: 'Bench Press',
      });

      const exists = await exerciseRepository.existsBySlug('bench-press');

      expect(exists).toBe(true);
    });

    it('should return false if exercise does not exist', async () => {
      const exists = await exerciseRepository.existsBySlug('non-existent-slug');

      expect(exists).toBe(false);
    });
  });
});
