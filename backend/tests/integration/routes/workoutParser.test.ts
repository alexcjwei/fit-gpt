import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../../src/app';
import { User } from '../../../src/models/User';
import { Exercise } from '../../../src/models/Exercise';
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

    // Seed exercise database with common exercises
    await Exercise.insertMany([
      {
        name: 'Back Squat',
        slug: 'back-squat',
        category: 'legs',
        primaryMuscles: ['quads', 'glutes'],
        secondaryMuscles: ['hamstrings', 'abs'],
        equipment: ['barbell'],
        difficulty: 'intermediate',
        movementPattern: 'squat',
        isUnilateral: false,
        isCompound: true,
        description: 'A fundamental lower body exercise',
        setupInstructions: 'Set up barbell on squat rack at appropriate height',
        formCues: ['Keep chest up', 'Drive through heels'],
      },
      {
        name: 'Trap Bar Deadlift',
        slug: 'trap-bar-deadlift',
        category: 'legs',
        primaryMuscles: ['hamstrings', 'glutes', 'quads'],
        secondaryMuscles: ['abs', 'upper-back'],
        equipment: ['trap-bar'],
        difficulty: 'intermediate',
        movementPattern: 'hinge',
        isUnilateral: false,
        isCompound: true,
        description: 'Deadlift variation using trap bar',
        setupInstructions: 'Step inside trap bar with feet hip-width apart',
        formCues: ['Keep back neutral', 'Push through floor'],
      },
      {
        name: 'Box Jumps',
        slug: 'box-jumps',
        category: 'legs',
        primaryMuscles: ['quads', 'glutes', 'calves'],
        secondaryMuscles: ['hamstrings'],
        equipment: ['box'],
        difficulty: 'intermediate',
        movementPattern: 'plyometric',
        isUnilateral: false,
        isCompound: true,
        description: 'Explosive plyometric exercise',
        setupInstructions: 'Stand facing box at appropriate distance',
        formCues: ['Land softly', 'Full hip extension'],
      },
      {
        name: 'Glute Bridge',
        slug: 'glute-bridge',
        category: 'legs',
        primaryMuscles: ['glutes'],
        secondaryMuscles: ['hamstrings', 'abs'],
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        movementPattern: 'hinge',
        isUnilateral: false,
        isCompound: false,
        description: 'Hip extension exercise for glutes',
        setupInstructions: 'Lie on back with knees bent and feet flat on floor',
        formCues: ['Squeeze glutes at top', 'Keep core tight'],
      },
      {
        name: 'Romanian Deadlift',
        slug: 'romanian-deadlift',
        category: 'legs',
        primaryMuscles: ['hamstrings', 'glutes'],
        secondaryMuscles: ['lower-back', 'upper-back'],
        equipment: ['barbell'],
        difficulty: 'intermediate',
        movementPattern: 'hinge',
        isUnilateral: false,
        isCompound: true,
        description: 'Hip hinge pattern focused on hamstrings',
        setupInstructions: 'Hold barbell at hip level with overhand grip',
        formCues: ['Slight knee bend', 'Push hips back'],
      },
      {
        name: 'Single Leg Box Step Up',
        slug: 'single-leg-box-step-up',
        category: 'legs',
        primaryMuscles: ['quads', 'glutes'],
        secondaryMuscles: ['hamstrings', 'calves'],
        equipment: ['box'],
        difficulty: 'intermediate',
        movementPattern: 'lunge',
        isUnilateral: true,
        isCompound: true,
        description: 'Unilateral leg exercise',
        setupInstructions: 'Stand in front of box with one foot on top',
        formCues: ['Drive through heel', 'Keep chest up'],
      },
      {
        name: 'Bulgarian Split Squat',
        slug: 'bulgarian-split-squat',
        category: 'legs',
        primaryMuscles: ['quads', 'glutes'],
        secondaryMuscles: ['hamstrings'],
        equipment: ['bench'],
        difficulty: 'intermediate',
        movementPattern: 'lunge',
        isUnilateral: true,
        isCompound: true,
        description: 'Rear foot elevated split squat',
        setupInstructions: 'Place rear foot on bench behind you',
        formCues: ['Keep torso upright', 'Front knee tracks over toes'],
      },
      {
        name: 'Nordic Hamstring Curl',
        slug: 'nordic-hamstring-curl',
        category: 'legs',
        primaryMuscles: ['hamstrings'],
        secondaryMuscles: ['glutes', 'abs'],
        equipment: ['bodyweight'],
        difficulty: 'advanced',
        movementPattern: 'pull',
        isUnilateral: false,
        isCompound: false,
        description: 'Eccentric hamstring exercise',
        setupInstructions: 'Anchor feet under pad or have partner hold',
        formCues: ['Control descent', 'Keep hips extended'],
      },
      {
        name: 'Calf Raise',
        slug: 'calf-raise',
        category: 'legs',
        primaryMuscles: ['calves'],
        secondaryMuscles: [],
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        movementPattern: 'push',
        isUnilateral: false,
        isCompound: false,
        description: 'Calf strengthening exercise',
        setupInstructions: 'Stand with feet hip-width apart',
        formCues: ['Full range of motion', 'Pause at top'],
      },
      {
        name: 'Plank',
        slug: 'plank',
        category: 'core',
        primaryMuscles: ['abs'],
        secondaryMuscles: ['shoulders'],
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        movementPattern: 'isometric',
        isUnilateral: false,
        isCompound: false,
        description: 'Isometric core exercise',
        setupInstructions: 'Get into push-up position on forearms',
        formCues: ['Keep body straight', 'Engage core'],
      },
      {
        name: 'Push-Up',
        slug: 'push-up',
        category: 'chest',
        primaryMuscles: ['chest', 'triceps'],
        secondaryMuscles: ['shoulders', 'abs'],
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        movementPattern: 'push',
        isUnilateral: false,
        isCompound: true,
        description: 'Classic bodyweight pushing exercise',
        setupInstructions: 'Start in plank position with hands shoulder-width apart',
        formCues: ['Keep body straight', 'Lower chest to ground', 'Push back up'],
      },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

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
    expect(gluteBridges.sets[0].targetRepsMin).toBe(15);
    expect(gluteBridges.sets[0].targetRepsMax).toBe(15);
    expect(gluteBridges.sets[0].completed).toBe(false);
    expect(gluteBridges.sets[0].id).toBeDefined();

    // Verify Superset A
    const supersetA = workout.blocks[1];
    expect(supersetA.label).toContain('Superset A');
    expect(supersetA.restPeriod).toContain('2-3 min');
    expect(supersetA.exercises).toHaveLength(2);

    // Verify Back Squat (first alternative chosen from "Back Squat or Trap Bar Deadlift")
    const backSquat = supersetA.exercises[0];
    expect(backSquat.exerciseId).toBeDefined();
    expect(backSquat.sets).toHaveLength(4); // "4 sets" from header
    expect(backSquat.sets[0].targetRepsMin).toBe(6);
    expect(backSquat.sets[0].targetRepsMax).toBe(8);

    // Verify Box Jumps
    const boxJumps = supersetA.exercises[1];
    expect(boxJumps.exerciseId).toBeDefined();
    expect(boxJumps.sets).toHaveLength(4); // Same as first exercise in superset
    expect(boxJumps.sets[0].targetRepsMin).toBe(5);
    expect(boxJumps.sets[0].targetRepsMax).toBe(5);

    // Verify Superset B
    const supersetB = workout.blocks[2];
    expect(supersetB.label).toContain('Superset B');
    expect(supersetB.restPeriod).toContain('90 sec');
    expect(supersetB.exercises).toHaveLength(2);

    // Verify Romanian Deadlifts
    const rdl = supersetB.exercises[0];
    expect(rdl.sets).toHaveLength(3);
    expect(rdl.sets[0].targetRepsMin).toBe(8);
    expect(rdl.sets[0].targetRepsMax).toBe(10);

    // Verify unilateral exercise (8/leg)
    const stepUps = supersetB.exercises[1];
    expect(stepUps.sets).toHaveLength(3);
    expect(stepUps.sets[0].targetRepsMin).toBe(8);
    expect(stepUps.sets[0].targetRepsMax).toBe(8);

    // Verify Superset C (3 exercises)
    const supersetC = workout.blocks[3];
    expect(supersetC.exercises).toHaveLength(3);

    // Verify time-based exercise (Plank: 45 sec)
    const coolDownBlock = workout.blocks[4];
    const plank = coolDownBlock.exercises[0];
    expect(plank.exerciseId).toBeDefined();
    expect(plank.sets).toHaveLength(1);
    expect(plank.sets[0].duration).toBe(45);
    // Time-based exercises should not have rep targets (null or undefined)
    expect(plank.sets[0].targetRepsMin == null).toBe(true);

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

    // Verify all IDs are UUIDs
    expect(workout.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
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
  }, 60000); // 60 second timeout for LLM calls

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
  }, 30000);

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

  it.skip('should use AI to resolve exercise when fuzzy search finds nothing', async () => {
    // TODO: This test is valid but currently skipped due to Anthropic API rate limits
    // The test makes multiple LLM calls (validation, structure extraction, AI resolver)
    // which can trigger "Overloaded" errors during test runs
    // Re-enable when we have better retry/backoff logic or when running against prod with higher limits
    // Use an exercise name that fuzzy search won't match (completely different from seeded exercises)
    // but AI should intelligently map to a similar leg exercise
    const workoutText = `
## Leg Day
- Mysterious Jumping Exercise: 3x10
- Front Squat Thing: 3x8
    `;

    const response = await request(app)
      .post('/api/workouts/parse')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: workoutText,
      })
      .expect(200);

    const workout = response.body.data;

    // Verify workout was parsed successfully
    expect(workout.blocks).toHaveLength(1);
    expect(workout.blocks[0].exercises).toHaveLength(2);

    // Both exercises should have valid exerciseIds (resolved via AI)
    const exercise1 = workout.blocks[0].exercises[0];
    const exercise2 = workout.blocks[0].exercises[1];

    expect(exercise1.exerciseId).toBeDefined();
    expect(exercise1.exerciseId).toMatch(/^[a-f0-9]{24}$/);

    expect(exercise2.exerciseId).toBeDefined();
    expect(exercise2.exerciseId).toMatch(/^[a-f0-9]{24}$/);
  }, 60000); // Longer timeout for AI calls
});
