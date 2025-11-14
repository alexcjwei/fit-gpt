import { Kysely } from 'kysely';
import { Database } from '../../../src/db/types';
import { WorkoutRepository } from '../../../src/repositories/WorkoutRepository';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import { connect, closeDatabase, clearDatabase, getTestDb } from '../../utils/testDb';

describe('WorkoutRepository', () => {
  let db: Kysely<Database>;
  let workoutRepository: WorkoutRepository;
  let userRepository: UserRepository;
  let exerciseRepository: ExerciseRepository;
  let testUserId: string;
  let testExerciseId: string;

  beforeAll(async () => {
    await connect();
    db = getTestDb();
    workoutRepository = new WorkoutRepository(db);
    userRepository = new UserRepository(db);
    exerciseRepository = new ExerciseRepository(db);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create test user
    const user = await userRepository.create({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });
    testUserId = user.id;

    // Create test exercise
    const exercise = await exerciseRepository.create({
      slug: 'bench-press',
      name: 'Bench Press',
      tags: ['chest'],
    });
    testExerciseId = exercise.id;
  });

  describe('create', () => {
    it('should create a simple workout without blocks', async () => {
      const workoutData = {
        userId: testUserId,
        name: 'Morning Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        notes: 'Feel good today',
      };

      const workout = await workoutRepository.create(workoutData);

      expect(workout).toBeDefined();
      expect(workout.id).toBeDefined();
      expect(workout.name).toBe('Morning Workout');
      expect(workout.date).toBe('2025-01-15');
      expect(workout.notes).toBe('Feel good today');
      expect(workout.blocks).toEqual([]);
    });

    it('should create workout with nested blocks, exercises, and sets', async () => {
      const workoutData = {
        userId: testUserId,
        name: 'Push Day',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [
          {
            label: 'Main Lift',
            exercises: [
              {
                exerciseId: testExerciseId,
                orderInBlock: 0,
                instruction: '3 x 5',
                sets: [
                  { setNumber: 1, reps: 5, weight: 135, weightUnit: 'lbs' as const },
                  { setNumber: 2, reps: 5, weight: 135, weightUnit: 'lbs' as const },
                  { setNumber: 3, reps: 5, weight: 135, weightUnit: 'lbs' as const },
                ],
              },
            ],
          },
        ],
      };

      const workout = await workoutRepository.create(workoutData);

      expect(workout.blocks).toHaveLength(1);
      expect(workout.blocks[0].label).toBe('Main Lift');
      expect(workout.blocks[0].exercises).toHaveLength(1);
      expect(workout.blocks[0].exercises[0].exerciseId).toBe(testExerciseId);
      expect(workout.blocks[0].exercises[0].sets).toHaveLength(3);
      expect(workout.blocks[0].exercises[0].sets[0].reps).toBe(5);
      expect(workout.blocks[0].exercises[0].sets[0].weight).toBe(135);
    });

    it('should create workout with multiple blocks and exercises', async () => {
      const exercise2 = await exerciseRepository.create({
        slug: 'squat',
        name: 'Squat',
        tags: ['legs'],
      });

      const workoutData = {
        userId: testUserId,
        name: 'Full Body',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [
          {
            label: 'Upper Body',
            exercises: [
              {
                exerciseId: testExerciseId,
                orderInBlock: 0,
                sets: [{ setNumber: 1, reps: 10, weight: 100, weightUnit: 'lbs' as const }],
              },
            ],
          },
          {
            label: 'Lower Body',
            exercises: [
              {
                exerciseId: exercise2.id,
                orderInBlock: 0,
                sets: [{ setNumber: 1, reps: 10, weight: 200, weightUnit: 'lbs' as const }],
              },
            ],
          },
        ],
      };

      const workout = await workoutRepository.create(workoutData);

      expect(workout.blocks).toHaveLength(2);
      expect(workout.blocks[0].label).toBe('Upper Body');
      expect(workout.blocks[1].label).toBe('Lower Body');
    });
  });

  describe('findById', () => {
    it('should find workout by ID with all nested data', async () => {
      const created = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [
          {
            label: 'Block 1',
            exercises: [
              {
                exerciseId: testExerciseId,
                orderInBlock: 0,
                sets: [{ setNumber: 1, reps: 10, weight: 100, weightUnit: 'lbs' as const }],
              },
            ],
          },
        ],
      });

      const found = await workoutRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test Workout');
      expect(found?.blocks).toHaveLength(1);
      expect(found?.blocks[0].exercises).toHaveLength(1);
      expect(found?.blocks[0].exercises[0].sets).toHaveLength(1);
    });

    it('should return null for non-existent ID', async () => {
      const found = await workoutRepository.findById('999999');

      expect(found).toBeNull();
    });

    it('should handle workout with no blocks', async () => {
      const created = await workoutRepository.create({
        userId: testUserId,
        name: 'Empty Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
      });

      const found = await workoutRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.blocks).toEqual([]);
    });
  });

  describe('findByUserId', () => {
    it('should find all workouts for a user', async () => {
      await workoutRepository.create({
        userId: testUserId,
        name: 'Workout 1',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
      });
      await workoutRepository.create({
        userId: testUserId,
        name: 'Workout 2',
        date: '2025-01-16',
        lastModifiedTime: '2025-01-16T08:00:00Z',
      });

      const workouts = await workoutRepository.findByUserId(testUserId);

      expect(workouts).toHaveLength(2);
    });

    it('should return workouts ordered by date (descending)', async () => {
      await workoutRepository.create({
        userId: testUserId,
        name: 'Older Workout',
        date: '2025-01-10',
        lastModifiedTime: '2025-01-10T08:00:00Z',
      });
      await workoutRepository.create({
        userId: testUserId,
        name: 'Newer Workout',
        date: '2025-01-20',
        lastModifiedTime: '2025-01-20T08:00:00Z',
      });

      const workouts = await workoutRepository.findByUserId(testUserId);

      expect(workouts[0].name).toBe('Newer Workout');
      expect(workouts[1].name).toBe('Older Workout');
    });

    it('should return empty array for user with no workouts', async () => {
      const user2 = await userRepository.create({
        email: 'user2@example.com',
        password: 'password123',
        name: 'User 2',
      });

      const workouts = await workoutRepository.findByUserId(user2.id);

      expect(workouts).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update workout name', async () => {
      const created = await workoutRepository.create({
        userId: testUserId,
        name: 'Original Name',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
      });

      const updated = await workoutRepository.update(created.id, {
        name: 'Updated Name',
      });

      expect(updated?.name).toBe('Updated Name');
    });

    it('should update workout date', async () => {
      const created = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
      });

      const updated = await workoutRepository.update(created.id, {
        date: '2025-01-20',
      });

      expect(updated?.date).toBe('2025-01-20');
    });

    it('should update workout notes', async () => {
      const created = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
      });

      const updated = await workoutRepository.update(created.id, {
        notes: 'New notes',
      });

      expect(updated?.notes).toBe('New notes');
    });

    it('should return null for non-existent ID', async () => {
      const updated = await workoutRepository.update('999999', {
        name: 'Updated Name',
      });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete workout', async () => {
      const created = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
      });

      const deleted = await workoutRepository.delete(created.id);

      expect(deleted).toBe(true);

      const found = await workoutRepository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should cascade delete blocks, exercises, and sets', async () => {
      const created = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [
          {
            label: 'Block 1',
            exercises: [
              {
                exerciseId: testExerciseId,
                orderInBlock: 0,
                sets: [{ setNumber: 1, reps: 10, weight: 100, weightUnit: 'lbs' as const }],
              },
            ],
          },
        ],
      });

      await workoutRepository.delete(created.id);

      // Verify all nested data is deleted
      const blocks = await db
        .selectFrom('workout_blocks')
        .selectAll()
        .where('workout_id', '=', BigInt(created.id))
        .execute();

      expect(blocks).toHaveLength(0);
    });

    it('should return false for non-existent ID', async () => {
      const deleted = await workoutRepository.delete('999999');

      expect(deleted).toBe(false);
    });
  });

  describe('addBlock', () => {
    it('should add block to workout', async () => {
      const workout = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
      });

      const block = await workoutRepository.addBlock(workout.id, {
        label: 'New Block',
        notes: 'Block notes',
      });

      expect(block.id).toBeDefined();
      expect(block.label).toBe('New Block');
      expect(block.notes).toBe('Block notes');

      const updated = await workoutRepository.findById(workout.id);
      expect(updated?.blocks).toHaveLength(1);
    });
  });

  describe('updateBlock', () => {
    it('should update block label', async () => {
      const workout = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [{ label: 'Original Label' }],
      });

      const blockId = workout.blocks[0].id;
      const updated = await workoutRepository.updateBlock(blockId, {
        label: 'Updated Label',
      });

      expect(updated?.label).toBe('Updated Label');
    });

    it('should return null for non-existent block', async () => {
      const updated = await workoutRepository.updateBlock('999999', {
        label: 'Updated Label',
      });

      expect(updated).toBeNull();
    });
  });

  describe('deleteBlock', () => {
    it('should delete block', async () => {
      const workout = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [{ label: 'Block 1' }],
      });

      const blockId = workout.blocks[0].id;
      const deleted = await workoutRepository.deleteBlock(blockId);

      expect(deleted).toBe(true);

      const updated = await workoutRepository.findById(workout.id);
      expect(updated?.blocks).toHaveLength(0);
    });

    it('should return false for non-existent block', async () => {
      const deleted = await workoutRepository.deleteBlock('999999');

      expect(deleted).toBe(false);
    });
  });

  describe('addExerciseToBlock', () => {
    it('should add exercise to block', async () => {
      const workout = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [{ label: 'Block 1' }],
      });

      const blockId = workout.blocks[0].id;
      const exercise = await workoutRepository.addExerciseToBlock(blockId, {
        exerciseId: testExerciseId,
        orderInBlock: 0,
        instruction: '3 x 10',
      });

      expect(exercise.id).toBeDefined();
      expect(exercise.exerciseId).toBe(testExerciseId);
      expect(exercise.instruction).toBe('3 x 10');
    });
  });

  describe('updateExerciseInstance', () => {
    it('should update exercise instruction', async () => {
      const workout = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [
          {
            label: 'Block 1',
            exercises: [
              {
                exerciseId: testExerciseId,
                orderInBlock: 0,
                instruction: '3 x 10',
              },
            ],
          },
        ],
      });

      const exerciseId = workout.blocks[0].exercises[0].id;
      const updated = await workoutRepository.updateExerciseInstance(exerciseId, {
        instruction: '4 x 12',
      });

      expect(updated?.instruction).toBe('4 x 12');
    });

    it('should return null for non-existent exercise', async () => {
      const updated = await workoutRepository.updateExerciseInstance('999999', {
        instruction: '4 x 12',
      });

      expect(updated).toBeNull();
    });
  });

  describe('deleteExerciseInstance', () => {
    it('should delete exercise instance', async () => {
      const workout = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [
          {
            label: 'Block 1',
            exercises: [
              {
                exerciseId: testExerciseId,
                orderInBlock: 0,
              },
            ],
          },
        ],
      });

      const exerciseId = workout.blocks[0].exercises[0].id;
      const deleted = await workoutRepository.deleteExerciseInstance(exerciseId);

      expect(deleted).toBe(true);

      const updated = await workoutRepository.findById(workout.id);
      expect(updated?.blocks[0].exercises).toHaveLength(0);
    });

    it('should return false for non-existent exercise', async () => {
      const deleted = await workoutRepository.deleteExerciseInstance('999999');

      expect(deleted).toBe(false);
    });
  });

  describe('addSet', () => {
    it('should add set to exercise instance', async () => {
      const workout = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [
          {
            label: 'Block 1',
            exercises: [
              {
                exerciseId: testExerciseId,
                orderInBlock: 0,
              },
            ],
          },
        ],
      });

      const exerciseId = workout.blocks[0].exercises[0].id;
      const set = await workoutRepository.addSet(exerciseId, {
        setNumber: 1,
        reps: 10,
        weight: 135,
        weightUnit: 'lbs',
      });

      expect(set.id).toBeDefined();
      expect(set.reps).toBe(10);
      expect(set.weight).toBe(135);
    });
  });

  describe('updateSet', () => {
    it('should update set reps and weight', async () => {
      const workout = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [
          {
            label: 'Block 1',
            exercises: [
              {
                exerciseId: testExerciseId,
                orderInBlock: 0,
                sets: [{ setNumber: 1, reps: 10, weight: 100, weightUnit: 'lbs' as const }],
              },
            ],
          },
        ],
      });

      const setId = workout.blocks[0].exercises[0].sets[0].id;
      const updated = await workoutRepository.updateSet(setId, {
        reps: 12,
        weight: 120,
      });

      expect(updated?.reps).toBe(12);
      expect(updated?.weight).toBe(120);
    });

    it('should return null for non-existent set', async () => {
      const updated = await workoutRepository.updateSet('999999', {
        reps: 12,
      });

      expect(updated).toBeNull();
    });
  });

  describe('deleteSet', () => {
    it('should delete set', async () => {
      const workout = await workoutRepository.create({
        userId: testUserId,
        name: 'Test Workout',
        date: '2025-01-15',
        lastModifiedTime: '2025-01-15T08:00:00Z',
        blocks: [
          {
            label: 'Block 1',
            exercises: [
              {
                exerciseId: testExerciseId,
                orderInBlock: 0,
                sets: [{ setNumber: 1, reps: 10, weight: 100, weightUnit: 'lbs' as const }],
              },
            ],
          },
        ],
      });

      const setId = workout.blocks[0].exercises[0].sets[0].id;
      const deleted = await workoutRepository.deleteSet(setId);

      expect(deleted).toBe(true);

      const updated = await workoutRepository.findById(workout.id);
      expect(updated?.blocks[0].exercises[0].sets).toHaveLength(0);
    });

    it('should return false for non-existent set', async () => {
      const deleted = await workoutRepository.deleteSet('999999');

      expect(deleted).toBe(false);
    });
  });
});
