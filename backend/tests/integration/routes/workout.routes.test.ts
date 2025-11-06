import request from 'supertest';
import app from '../../../src/app';
import * as testDb from '../../utils/testDb';
import { User } from '../../../src/models/User';
import { Exercise } from '../../../src/models/Exercise';
import { Workout } from '../../../src/models/Workout';
import { generateToken } from '../../../src/services/auth.service';
import mongoose from 'mongoose';

/**
 * Integration tests for workout routes
 * These tests use an in-memory MongoDB database to test the full request/response cycle
 */
describe('Workout Routes Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let exercise1Id: string;
  let exercise2Id: string;

  // Setup: Connect to in-memory database before all tests
  beforeAll(async () => {
    await testDb.connect();
  });

  // Cleanup: Clear database after each test to ensure isolation
  afterEach(async () => {
    await testDb.clearDatabase();
  });

  // Teardown: Close database connection after all tests
  afterAll(async () => {
    await testDb.closeDatabase();
  });

  beforeEach(async () => {
    // Create a test user
    const user = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword123',
      name: 'Test User',
    });
    userId = (user._id as mongoose.Types.ObjectId).toString();
    authToken = generateToken(userId);

    // Seed exercise database with test exercises
    const exercise1 = await Exercise.create({
      name: 'Barbell Bench Press',
      slug: 'barbell-bench-press',
      category: 'chest',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['triceps', 'shoulders'],
      equipment: ['barbell'],
      difficulty: 'intermediate',
      movementPattern: 'push',
      isUnilateral: false,
      isCompound: true,
    });
    exercise1Id = (exercise1._id as mongoose.Types.ObjectId).toString();

    const exercise2 = await Exercise.create({
      name: 'Back Squat',
      slug: 'back-squat',
      category: 'legs',
      primaryMuscles: ['quads', 'glutes'],
      secondaryMuscles: ['hamstrings'],
      equipment: ['barbell'],
      difficulty: 'intermediate',
      movementPattern: 'squat',
      isUnilateral: false,
      isCompound: true,
    });
    exercise2Id = (exercise2._id as mongoose.Types.ObjectId).toString();
  });

  describe('GET /api/workouts/:id', () => {
    it('should return workout with resolved exercise names', async () => {
      // Create a workout with exercises
      const workout = await Workout.create({
        userId: new mongoose.Types.ObjectId(userId),
        name: 'Upper Body Day',
        date: '2025-11-05',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: 'block-1',
            label: 'Main Lift',
            exercises: [
              {
                id: 'exercise-1',
                exerciseId: exercise1Id,
                orderInBlock: 0,
                instruction: '3 x 8-10 reps',
                sets: [
                  {
                    id: 'set-1',
                    setNumber: 1,
                    reps: 10,
                    weight: 135,
                    weightUnit: 'lbs',
                  },
                  {
                    id: 'set-2',
                    setNumber: 2,
                    reps: 8,
                    weight: 145,
                    weightUnit: 'lbs',
                  },
                ],
              },
            ],
          },
          {
            id: 'block-2',
            label: 'Accessory',
            exercises: [
              {
                id: 'exercise-2',
                exerciseId: exercise2Id,
                orderInBlock: 0,
                instruction: '4 x 12 reps',
                sets: [
                  {
                    id: 'set-3',
                    setNumber: 1,
                    reps: 12,
                    weight: 95,
                    weightUnit: 'lbs',
                  },
                ],
              },
            ],
          },
        ],
      });

      const workoutId = (workout._id as mongoose.Types.ObjectId).toString();

      // Fetch the workout
      const response = await request(app)
        .get(`/api/workouts/${workoutId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify response structure includes exercise names
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: workoutId,
        name: 'Upper Body Day',
        date: '2025-11-05',
      });
      expect(response.body.data.lastModifiedTime).toBeDefined();

      // Verify block structure
      expect(response.body.data.blocks).toHaveLength(2);

      // Check first block
      const block1 = response.body.data.blocks[0];
      expect(block1).toMatchObject({
        id: 'block-1',
        label: 'Main Lift',
      });
      expect(block1.exercises).toHaveLength(1);

      // Check first exercise with resolved name
      const exercise1 = block1.exercises[0];
      expect(exercise1).toMatchObject({
        id: 'exercise-1',
        exerciseId: exercise1Id,
        exerciseName: 'Barbell Bench Press', // Resolved name
        orderInBlock: 0,
        instruction: '3 x 8-10 reps',
      });
      expect(exercise1.sets).toHaveLength(2);
      expect(exercise1.sets[0]).toMatchObject({
        id: 'set-1',
        setNumber: 1,
        reps: 10,
        weight: 135,
        weightUnit: 'lbs',
      });

      // Check second block
      const block2 = response.body.data.blocks[1];
      expect(block2).toMatchObject({
        id: 'block-2',
        label: 'Accessory',
      });
      expect(block2.exercises).toHaveLength(1);

      // Check second exercise with resolved name
      const exercise2 = block2.exercises[0];
      expect(exercise2).toMatchObject({
        id: 'exercise-2',
        exerciseId: exercise2Id,
        exerciseName: 'Back Squat', // Resolved name
        orderInBlock: 0,
        instruction: '4 x 12 reps',
      });
      expect(exercise2.sets).toHaveLength(1);
    });

    it('should handle missing exercises gracefully with "Unknown Exercise" fallback', async () => {
      const nonExistentExerciseId = new mongoose.Types.ObjectId().toString();

      // Create a workout with a non-existent exercise ID
      const workout = await Workout.create({
        userId: new mongoose.Types.ObjectId(userId),
        name: 'Test Workout',
        date: '2025-11-05',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: 'block-1',
            label: 'Block 1',
            exercises: [
              {
                id: 'exercise-1',
                exerciseId: nonExistentExerciseId,
                orderInBlock: 0,
                sets: [],
              },
            ],
          },
        ],
      });

      const workoutId = (workout._id as mongoose.Types.ObjectId).toString();

      // Fetch the workout
      const response = await request(app)
        .get(`/api/workouts/${workoutId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify that missing exercise shows "Unknown Exercise"
      expect(response.body.data.blocks[0].exercises[0].exerciseName).toBe('Unknown Exercise');
    });

    it('should return 404 for non-existent workout', async () => {
      const nonExistentWorkoutId = new mongoose.Types.ObjectId().toString();

      await request(app)
        .get(`/api/workouts/${nonExistentWorkoutId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const workout = await Workout.create({
        userId: new mongoose.Types.ObjectId(userId),
        name: 'Test Workout',
        date: '2025-11-05',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      });

      const workoutId = (workout._id as mongoose.Types.ObjectId).toString();

      await request(app)
        .get(`/api/workouts/${workoutId}`)
        // No Authorization header
        .expect(401);
    });
  });
});
