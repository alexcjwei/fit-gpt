import request from 'supertest';
import app from '../../../src/app';
import * as testDb from '../../utils/testDb';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { generateToken } from '../../../src/services/auth.service';
import { WorkoutRepository } from '../../../src/repositories/WorkoutRepository';

/**
 * Integration tests for workout parser controller
 * These tests use PostgreSQL test database to test the full request/response cycle
 * for parsing workout text via the /api/workouts/parse endpoint
 */
describe('Workout Parser Controller Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let userRepo: UserRepository;
  let workoutRepo: WorkoutRepository;

  // Setup: Connect to test database before all tests
  beforeAll(async () => {
    await testDb.connect();
    const db = testDb.getTestDb();
    userRepo = new UserRepository(db);
    workoutRepo = new WorkoutRepository(db);
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
    // Seed exercises before each test
    await testDb.seedExercises();

    // Create a test user and generate auth token
    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'hashedpassword123',
      name: 'Test User',
    });
    userId = user.id;
    authToken = generateToken(userId);
  });

  describe('POST /api/workouts/parse', () => {
    const workoutText = `WEDNESDAY: Upper Body Strength + Core Stability
WARM UP / ACTIVATION (8-10 mins)

Arm circles: 10 forward, 10 backward
Band pull-aparts: 2x15
Scapular push-ups: 2x10
Dead hangs: 2x20 seconds
Cat-cow: 10 reps


SUPERSET A (3 sets, 2 min rest)
A1: Bench Press (Barbell or DB) - 3x8 @ Medium-Heavy
A2: Single Arm DB Row - 3x10 each arm @ Medium-Heavy

SUPERSET B (3 sets, 90 sec rest)
B1: Overhead Press (Barbell or DB) - 3x8 @ Medium
B2: Pull-Ups or Lat Pulldown - 3x8-10 @ Medium to Medium-Heavy

SUPERSET C (3 sets, 60 sec rest)
C1: Single Arm Landmine Press - 3x10 each arm @ Medium-Light
C2: Face Pulls - 3x15 @ Light to Medium-Light
C3: Plank Variations - 3x30-45 seconds (alternate: standard, side plank left, side plank right)

COOL DOWN / CORE CIRCUIT (8-10 mins)

Russian twists: 3x20 total
Hollow body hold: 3x20 seconds
Bird dogs: 3x10 each side
Child's pose: 60 seconds
Doorway pec stretch: 60 seconds each side`;

    it('should successfully parse workout text and save to database', async () => {
      const response = await request(app)
        .post('/api/workouts/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: workoutText })
        .expect(200);

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const workout = response.body.data;

      // Verify workout has been properly parsed
      expect(workout.id).toBeDefined();
      expect(workout.name).toBeDefined();
      expect(workout.date).toBeDefined();
      expect(workout.lastModifiedTime).toBeDefined();
      expect(workout.blocks).toBeDefined();
      expect(Array.isArray(workout.blocks)).toBe(true);
      expect(workout.blocks.length).toBeGreaterThan(0);

      // Verify blocks have proper structure
      workout.blocks.forEach((block: any) => {
        expect(block.id).toBeDefined();
        expect(Array.isArray(block.exercises)).toBe(true);

        // Verify exercises have been resolved with IDs
        block.exercises.forEach((exercise: any) => {
          expect(exercise.id).toBeDefined();
          expect(exercise.exerciseId).toBeDefined();
          expect(typeof exercise.exerciseId).toBe('string');
          expect(exercise.orderInBlock).toBeDefined();
          expect(Array.isArray(exercise.sets)).toBe(true);

          // Verify sets have proper structure
          exercise.sets.forEach((set: any) => {
            expect(set.id).toBeDefined();
            expect(set.setNumber).toBeDefined();
            expect(set.weightUnit).toBeDefined();
          });
        });
      });

      // Verify workout was saved to database
      const savedWorkout = await workoutRepo.findById(workout.id);
      expect(savedWorkout).toBeDefined();
      expect(savedWorkout!.id).toBe(workout.id);
    }, 120000); // Long timeout for LLM calls

    it('should handle custom date option', async () => {
      const customDate = '2024-12-25';

      const response = await request(app)
        .post('/api/workouts/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Bench Press 3x10\nSquats 4x8',
          date: customDate,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.date).toBe(customDate);
    }, 120000);

    it('should handle custom weightUnit option', async () => {
      const response = await request(app)
        .post('/api/workouts/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Bench Press 3x10\nSquats 4x8',
          weightUnit: 'kg',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify all sets use kg
      const workout = response.body.data;
      const allSets = workout.blocks.flatMap((block: any) =>
        block.exercises.flatMap((exercise: any) => exercise.sets)
      );

      allSets.forEach((set: any) => {
        expect(set.weightUnit).toBe('kg');
      });
    }, 120000);

    it('should return 401 when no auth token provided', async () => {
      const response = await request(app)
        .post('/api/workouts/parse')
        .send({ text: 'Bench Press 3x10' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when text is missing', async () => {
      const response = await request(app)
        .post('/api/workouts/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when text is too short', async () => {
      const response = await request(app)
        .post('/api/workouts/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: 'short' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when date format is invalid', async () => {
      const response = await request(app)
        .post('/api/workouts/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Bench Press 3x10',
          date: 'invalid-date',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when weightUnit is invalid', async () => {
      const response = await request(app)
        .post('/api/workouts/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Bench Press 3x10',
          weightUnit: 'invalid',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject non-workout content', async () => {
      const nonWorkoutText = `# Chocolate Chip Cookie Recipe

## Ingredients
- 2 cups flour
- 1 cup sugar
- 1 cup butter

## Instructions
1. Mix ingredients
2. Bake at 350°F`;

      const response = await request(app)
        .post('/api/workouts/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: nonWorkoutText })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('does not appear to be workout content');
    }, 60000);
  });
});
