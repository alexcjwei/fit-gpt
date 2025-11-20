import request from 'supertest';
import { createApp } from '../../../src/createApp';
import { TestContainer } from '../../utils/testContainer';
import { generateToken } from '../../../src/services/auth.service';
import { createUserRepository } from '../../../src/repositories/UserRepository';
import { createExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import { createWorkoutRepository } from '../../../src/repositories/WorkoutRepository';
import type { UserRepository } from '../../../src/repositories/UserRepository';
import type { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import type { WorkoutRepository } from '../../../src/repositories/WorkoutRepository';

/**
 * Integration tests for workout routes
 * These tests use an isolated PostgreSQL container for complete test isolation
 */
describe('Workout Routes Integration Tests', () => {
  const testContainer = new TestContainer();
  let app: ReturnType<typeof createApp>;
  let authToken: string;
  let userId: string;
  let exercise1Id: string;
  let exercise2Id: string;
  let userRepo: UserRepository;
  let exerciseRepo: ExerciseRepository;
  let workoutRepo: WorkoutRepository;

  // Setup: Start isolated container and connect to test database before all tests
  beforeAll(async () => {
    const db = await testContainer.start();
    app = createApp(db, null, true); // Skip rate limiting for workout tests
    userRepo = createUserRepository(db);
    exerciseRepo = createExerciseRepository(db);
    workoutRepo = createWorkoutRepository(db);
  });

  // Cleanup: Clear database after each test to ensure isolation
  afterEach(async () => {
    await testContainer.clearDatabase();
  });

  // Teardown: Stop container and close database connection after all tests
  afterAll(async () => {
    await testContainer.stop();
  });

  beforeEach(async () => {
    // Create a test user
    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'hashedpassword123',
      name: 'Test User',
    });
    userId = user.id;
    authToken = generateToken(userId);

    // Seed exercise database with test exercises
    const exercise1 = await exerciseRepo.create({
      slug: 'barbell-bench-press',
      name: 'Barbell Bench Press',
      tags: ['chest', 'push', 'barbell', 'compound'],
    });
    exercise1Id = exercise1.id;

    const exercise2 = await exerciseRepo.create({
      slug: 'back-squat',
      name: 'Back Squat',
      tags: ['legs', 'squat', 'barbell', 'compound'],
    });
    exercise2Id = exercise2.id;
  });

  describe('IDOR Protection Tests', () => {
    it('should prevent user from accessing another user\'s workout (GET)', async () => {
      // Create User B
      const userB = await userRepo.create({
        email: 'userb@example.com',
        password: 'hashedpassword456',
        name: 'User B',
      });
      const userBId = userB.id;

      // User B creates a workout
      const userBWorkout = await workoutRepo.create({
        userId: userBId,
        name: 'User B Workout',
        date: '2025-11-10',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      });

      // User A (original test user) tries to access User B's workout
      const response = await request(app)
        .get(`/api/workouts/${userBWorkout.id}`)
        .set('Authorization', `Bearer ${authToken}`) // User A's token
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/access denied|forbidden/i);
    });

    it('should prevent user from updating another user\'s workout (PUT)', async () => {
      // Create User B
      const userB = await userRepo.create({
        email: 'userb@example.com',
        password: 'hashedpassword456',
        name: 'User B',
      });
      const userBId = userB.id;

      // User B creates a workout
      const userBWorkout = await workoutRepo.create({
        userId: userBId,
        name: 'User B Workout',
        date: '2025-11-10',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      });

      // User A tries to update User B's workout
      const response = await request(app)
        .put(`/api/workouts/${userBWorkout.id}`)
        .set('Authorization', `Bearer ${authToken}`) // User A's token
        .send({ name: 'Hacked Workout Name' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/access denied|forbidden/i);
    });

    it('should prevent user from deleting another user\'s workout (DELETE)', async () => {
      // Create User B
      const userB = await userRepo.create({
        email: 'userb@example.com',
        password: 'hashedpassword456',
        name: 'User B',
      });
      const userBId = userB.id;

      // User B creates a workout
      const userBWorkout = await workoutRepo.create({
        userId: userBId,
        name: 'User B Workout',
        date: '2025-11-10',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      });

      // User A tries to delete User B's workout
      const response = await request(app)
        .delete(`/api/workouts/${userBWorkout.id}`)
        .set('Authorization', `Bearer ${authToken}`) // User A's token
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/access denied|forbidden/i);

      // Verify workout still exists
      const stillExists = await workoutRepo.findById(userBWorkout.id);
      expect(stillExists).not.toBeNull();
    });

    it('should prevent user from duplicating another user\'s workout (POST)', async () => {
      // Create User B
      const userB = await userRepo.create({
        email: 'userb@example.com',
        password: 'hashedpassword456',
        name: 'User B',
      });
      const userBId = userB.id;

      // User B creates a workout
      const userBWorkout = await workoutRepo.create({
        userId: userBId,
        name: 'User B Workout',
        date: '2025-11-10',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      });

      // User A tries to duplicate User B's workout
      const response = await request(app)
        .post(`/api/workouts/${userBWorkout.id}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`) // User A's token
        .send({ newDate: '2025-11-11' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/access denied|forbidden/i);
    });

    it('should allow user to access their own workout', async () => {
      // User A creates their own workout
      const userAWorkout = await workoutRepo.create({
        userId,
        name: 'User A Workout',
        date: '2025-11-10',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      });

      // User A accesses their own workout - should succeed
      const response = await request(app)
        .get(`/api/workouts/${userAWorkout.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('User A Workout');
    });
  });

  describe('GET /api/workouts/:id', () => {
    it('should return workout with resolved exercise names', async () => {
      // Create a workout with exercises
      const workout = await workoutRepo.create({
        userId,
        name: 'Upper Body Day',
        date: '2025-11-05',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            label: 'Main Lift',
            exercises: [
              {
                exerciseId: exercise1Id,
                orderInBlock: 0,
                prescription: '3 x 8-10 reps',
                sets: [
                  {
                    setNumber: 1,
                    reps: 10,
                    weight: 135,
                    weightUnit: 'lbs',
                  },
                  {
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
            label: 'Accessory',
            exercises: [
              {
                exerciseId: exercise2Id,
                orderInBlock: 0,
                prescription: '4 x 12 reps',
                sets: [
                  {
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

      const workoutId = workout.id;

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

      // Check first block (IDs are auto-generated UUIDs)
      const block1 = response.body.data.blocks[0];
      expect(block1).toMatchObject({
        label: 'Main Lift',
      });
      expect(block1.id).toBeDefined(); // UUID generated by database
      expect(block1.exercises).toHaveLength(1);

      // Check first exercise with resolved name
      const exercise1 = block1.exercises[0];
      expect(exercise1).toMatchObject({
        exerciseId: exercise1Id,
        exerciseName: 'Barbell Bench Press', // Resolved name
        orderInBlock: 0,
        prescription: '3 x 8-10 reps',
      });
      expect(exercise1.id).toBeDefined(); // UUID generated by database
      expect(exercise1.sets).toHaveLength(2);
      expect(exercise1.sets[0]).toMatchObject({
        setNumber: 1,
        reps: 10,
        weight: 135,
        weightUnit: 'lbs',
      });
      expect(exercise1.sets[0].id).toBeDefined(); // UUID generated by database

      // Check second block
      const block2 = response.body.data.blocks[1];
      expect(block2).toMatchObject({
        label: 'Accessory',
      });
      expect(block2.id).toBeDefined(); // UUID generated by database
      expect(block2.exercises).toHaveLength(1);

      // Check second exercise with resolved name
      const exercise2 = block2.exercises[0];
      expect(exercise2).toMatchObject({
        exerciseId: exercise2Id,
        exerciseName: 'Back Squat', // Resolved name
        orderInBlock: 0,
        prescription: '4 x 12 reps',
      });
      expect(exercise2.id).toBeDefined(); // UUID generated by database
      expect(exercise2.sets).toHaveLength(1);
    });

    it('should enforce foreign key constraint for exercise IDs', async () => {
      const nonExistentExerciseId = '99999'; // Non-existent numeric ID

      // Attempt to create a workout with a non-existent exercise ID
      // PostgreSQL enforces referential integrity, so this should fail
      await expect(
        workoutRepo.create({
          userId,
          name: 'Test Workout',
          date: '2025-11-05',
          lastModifiedTime: new Date().toISOString(),
          blocks: [
            {
              label: 'Block 1',
              exercises: [
                {
                  exerciseId: nonExistentExerciseId,
                  orderInBlock: 0,
                  sets: [],
                },
              ],
            },
          ],
        })
      ).rejects.toThrow(); // Foreign key constraint violation
    });

    it('should return 404 for non-existent workout', async () => {
      const nonExistentWorkoutId = '99999'; // Non-existent numeric ID

      await request(app)
        .get(`/api/workouts/${nonExistentWorkoutId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const workout = await workoutRepo.create({
        userId,
        name: 'Test Workout',
        date: '2025-11-05',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      });

      const workoutId = workout.id;

      await request(app)
        .get(`/api/workouts/${workoutId}`)
        // No Authorization header
        .expect(401);
    });
  });
});
