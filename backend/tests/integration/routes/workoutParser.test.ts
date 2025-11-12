import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../../src/app';
import { User } from '../../../src/models/User';
import { Exercise } from '../../../src/models/Exercise';
import { Workout } from '../../../src/models/Workout';
import { generateToken } from '../../../src/services/auth.service';

describe('POST /api/workouts/parse - Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create a test user
    const user = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword123',
      name: 'Test User',
    });
    userId = (user._id as mongoose.Types.ObjectId).toString();
    authToken = generateToken(userId);

    // Seed exercise database with common exercises using new simplified schema
    await Exercise.insertMany([
      {
        name: 'Back Squat',
        slug: 'back-squat',
        tags: ['quads', 'glutes', 'hamstrings', 'abs', 'barbell', 'squat', 'compound', 'intermediate'],
      },
      {
        name: 'Trap Bar Deadlift',
        slug: 'trap-bar-deadlift',
        tags: ['hamstrings', 'glutes', 'quads', 'abs', 'upper-back', 'trap-bar', 'hinge', 'compound', 'intermediate'],
      },
      {
        name: 'Box Jumps',
        slug: 'box-jumps',
        tags: ['quads', 'glutes', 'calves', 'hamstrings', 'box', 'plyometric', 'compound', 'intermediate'],
      },
      {
        name: 'Glute Bridge',
        slug: 'glute-bridge',
        tags: ['glutes', 'hamstrings', 'abs', 'bodyweight', 'hinge', 'isolation', 'beginner'],
      },
      {
        name: 'Romanian Deadlift',
        slug: 'romanian-deadlift',
        tags: ['hamstrings', 'glutes', 'lower-back', 'upper-back', 'barbell', 'hinge', 'compound', 'intermediate'],
      },
      {
        name: 'Single Leg Box Step Up',
        slug: 'single-leg-box-step-up',
        tags: ['quads', 'glutes', 'hamstrings', 'calves', 'box', 'lunge', 'unilateral', 'compound', 'intermediate'],
      },
      {
        name: 'Bulgarian Split Squat',
        slug: 'bulgarian-split-squat',
        tags: ['quads', 'glutes', 'hamstrings', 'bench', 'lunge', 'unilateral', 'compound', 'intermediate'],
      },
      {
        name: 'Nordic Hamstring Curl',
        slug: 'nordic-hamstring-curl',
        tags: ['hamstrings', 'glutes', 'abs', 'bodyweight', 'pull', 'isolation', 'advanced'],
      },
      {
        name: 'Calf Raise',
        slug: 'calf-raise',
        tags: ['calves', 'bodyweight', 'push', 'isolation', 'beginner'],
      },
      {
        name: 'Plank',
        slug: 'plank',
        tags: ['abs', 'shoulders', 'bodyweight', 'isometric', 'isolation', 'beginner'],
      },
      {
        name: 'Push-Up',
        slug: 'push-up',
        tags: ['chest', 'triceps', 'shoulders', 'abs', 'bodyweight', 'push', 'compound', 'beginner'],
      },
    ]);
  }, 30000); // 30 second timeout for MongoDB setup and seeding

  afterEach(async () => {
    // Clear dynamically created data after each test
    // Keep seed data (exercises with needsReview: false)
    await Workout.deleteMany({});
    await Exercise.deleteMany({ needsReview: true });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  }, 10000); // 10 second timeout for cleanup

  it('should parse a complex workout with supersets and multiple blocks', async () => {
    const workoutText = `
## Lower Body Strength + Power

**Warm Up / Activation**
- Glute bridges: 2x15

**Superset A (4 sets, 2-3 min rest)**
1. Back Squat or Trap Bar Deadlift: 6-8 reps
2. Box Jumps: 5 reps

**Superset B (3 sets, 90 sec rest)**
1. Romanian Deadlifts: 8-10 reps
2. Single-leg Box Step-ups: 8/leg

**Superset C (3 sets, 90 sec rest)**
1. Bulgarian Split Squats: 10/leg
2. Nordic Hamstring Curls: 6-8 reps
3. Calf Raises: 15 reps

**Cool Down**
- Plank: 45 sec
    `;

    const response = await request(app)
      .post('/api/workouts/parse')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: workoutText,
        date: '2025-11-01',
        weightUnit: 'lbs',
      })
      .expect(200);

    const workout = response.body.data;

    // Verify workout structure
    expect(workout.name).toBe('Lower Body Strength + Power');
    // Date may be returned as ISO string, so extract just the date part
    const dateStr = typeof workout.date === 'string' && workout.date.includes('T')
      ? workout.date.split('T')[0]
      : workout.date;
    expect(dateStr).toBe('2025-11-01');
    expect(workout.id).toBeDefined();

    // Should have 5 blocks: Warm Up, Superset A, B, C, Cool Down
    expect(workout.blocks).toHaveLength(5);

    // Verify Warm Up block
    const warmUpBlock = workout.blocks[0];
    expect(warmUpBlock.label).toContain('Warm Up');
    expect(warmUpBlock.exercises).toHaveLength(1);
    expect(warmUpBlock.id).toBeDefined();

    // Verify Glute bridges: 2x15
    const gluteBridges = warmUpBlock.exercises[0];
    expect(gluteBridges.exerciseId).toBeDefined();
    expect(gluteBridges.sets).toHaveLength(2);
    expect(gluteBridges.sets[0].id).toBeDefined();
    // 2 x 15
    expect(gluteBridges.instruction).toContain("2");
    expect(gluteBridges.instruction).toContain("15");

    // Verify Superset A
    const supersetA = workout.blocks[1];
    expect(supersetA.label).toContain('Superset A');
    expect(supersetA.exercises).toHaveLength(2);

    // Verify Back Squat (first alternative chosen from "Back Squat or Trap Bar Deadlift")
    const backSquat = supersetA.exercises[0];
    expect(backSquat.exerciseId).toBeDefined();
    expect(backSquat.sets).toHaveLength(4); // "4 sets" from header
    // 4 x 6-8
    expect(backSquat.instruction).toContain("4")
    expect(backSquat.instruction).toContain("6-8")

    // Verify Box Jumps
    const boxJumps = supersetA.exercises[1];
    expect(boxJumps.exerciseId).toBeDefined();
    expect(boxJumps.sets).toHaveLength(4); // Same as first exercise in superset
    // 4 x 5 (Rest 2-3 min)
    expect(boxJumps.instruction).toContain("4")
    expect(boxJumps.instruction).toContain("5")
    expect(boxJumps.instruction).toContain("Rest")

    // Verify Superset B
    const supersetB = workout.blocks[2];
    expect(supersetB.label).toContain('Superset B');
    expect(supersetB.exercises).toHaveLength(2);

    // Verify Romanian Deadlifts
    const rdl = supersetB.exercises[0];
    expect(rdl.sets).toHaveLength(3);
    // 3 x 8-10
    expect(rdl.instruction).toContain("3")
    expect(rdl.instruction).toContain("8-10")

    // Verify unilateral exercise (8/leg)
    const stepUps = supersetB.exercises[1];
    expect(stepUps.sets).toHaveLength(3);
    // 3 x 8 ea.
    expect(stepUps.instruction).toContain("3")
    expect(stepUps.instruction).toContain("8")
    expect(stepUps.instruction).toContain("ea")

    // Verify Superset C (3 exercises)
    const supersetC = workout.blocks[3];
    expect(supersetC.exercises).toHaveLength(3);

    // Verify time-based exercise (Plank: 45 sec)
    const coolDownBlock = workout.blocks[4];
    const plank = coolDownBlock.exercises[0];
    expect(plank.exerciseId).toBeDefined();
    expect(plank.sets).toHaveLength(1);

    // Verify all exercises have valid exerciseIds (resolved from database)
    workout.blocks.forEach((block: any) => {
      block.exercises.forEach((exercise: any) => {
        expect(exercise.exerciseId).toBeDefined();
        expect(typeof exercise.exerciseId).toBe('string');
        expect(exercise.exerciseId.length).toBeGreaterThan(0);
        // Should be MongoDB ObjectId format (24 hex chars) after resolution
        expect(exercise.exerciseId).toMatch(/^[a-f0-9]{24}$/);
      });
    });

    // Verify workout ID is MongoDB ObjectId, nested IDs are UUIDs
    expect(workout.id).toMatch(/^[a-f0-9]{24}$/);
    workout.blocks.forEach((block: any) => {
      expect(block.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      block.exercises.forEach((exercise: any) => {
        expect(exercise.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
        exercise.sets.forEach((set: any) => {
          expect(set.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
          );
        });
      });
    });

    // Verify all sets have reps, weight, and duration set to null
    workout.blocks.forEach((block: any) => {
      block.exercises.forEach((exercise: any) => {
        exercise.sets.forEach((set: any) => {
          // All these fields should be null, NOT numbers or undefined
          expect(set.reps).toBeNull();
          expect(set.weight).toBeNull();
          expect(set.duration).toBeNull();
        });
      });
    });
  }, 90000);

  it('should require authentication', async () => {
    const workoutText = 'Push-ups: 3x10';

    await request(app)
      .post('/api/workouts/parse')
      .send({ text: workoutText })
      .expect(401);
  });

  it('should validate required text field', async () => {
    await request(app)
      .post('/api/workouts/parse')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: '2025-11-01',
      })
      .expect(400);
  });

  it('should validate text minimum length', async () => {
    await request(app)
      .post('/api/workouts/parse')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'short',
      })
      .expect(400);
  });

  it('should reject non-workout content', async () => {
    const nonWorkoutText = `
This is a recipe for chocolate chip cookies.
Ingredients: flour, sugar, butter, eggs, chocolate chips.
Mix everything together and bake at 350°F for 12 minutes.
    `;

    const response = await request(app)
      .post('/api/workouts/parse')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: nonWorkoutText,
      })
      .expect(400);

    expect(response.body.error).toContain('does not appear to be workout content');
  }, 60000);

  it('should use default date when not provided', async () => {
    const workoutText = 'Push-ups: 3x10\nSquats: 3x12';

    const response = await request(app)
      .post('/api/workouts/parse')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: workoutText,
      })
      .expect(200);

    const today = new Date().toISOString().split('T')[0];
    expect(response.body.data.date).toBe(today);
  }, 30000);

  it('should create a new exercise when AI cannot find a match in database', async () => {
    const workoutText = `
## Test Workout

**Main Lifts**
- Zorganian Shoulder Rotator: 3x10
    `;

    const response = await request(app)
      .post('/api/workouts/parse')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: workoutText,
      })
      .expect(200);

    const workout = response.body.data;

    // Verify workout was created successfully
    expect(workout.id).toBeDefined();
    expect(workout.blocks).toHaveLength(1);
    expect(workout.blocks[0].exercises).toHaveLength(1);

    // Verify both exercises have valid exerciseIds
    const exercise1 = workout.blocks[0].exercises[0];

    expect(exercise1.exerciseId).toBeDefined();
    expect(exercise1.exerciseId).toMatch(/^[a-f0-9]{24}$/);
    expect(exercise1.exerciseName).toBeDefined();

    // Fetch the created exercises from database to verify needsReview flag
    const createdExercise1 = await Exercise.findById(exercise1.exerciseId);

    expect(createdExercise1).toBeDefined();
    expect(createdExercise1?.needsReview).toBe(true);
    expect(createdExercise1?.name).toBeDefined();
    expect(createdExercise1?.slug).toBeDefined();
    expect(createdExercise1?.tags).toBeDefined();
    expect(Array.isArray(createdExercise1?.tags)).toBe(true);

  }, 60000);
});
