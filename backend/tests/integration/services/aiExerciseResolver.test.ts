import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Exercise } from '../../../src/models/Exercise';
import { UnresolvedExercise } from '../../../src/models/UnresolvedExercise';
import { AiExerciseResolver } from '../../../src/services/workoutParser/aiExerciseResolver';
import { ExerciseSearchService } from '../../../src/services/exerciseSearch.service';
import { LLMService } from '../../../src/services/llm.service';
import { WorkoutWithPlaceholders } from '../../../src/services/workoutParser/types';

describe('AiExerciseResolver - Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  let resolver: AiExerciseResolver;
  let searchService: ExerciseSearchService;
  let llmService: LLMService;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Seed database with a small set of leg exercises
    await Exercise.insertMany([
      {
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
        description: 'Fundamental lower body exercise',
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
      },
      {
        name: 'Romanian Deadlift',
        slug: 'romanian-deadlift',
        category: 'legs',
        primaryMuscles: ['hamstrings', 'glutes'],
        secondaryMuscles: ['lower-back'],
        equipment: ['barbell'],
        difficulty: 'intermediate',
        movementPattern: 'hinge',
        isUnilateral: false,
        isCompound: true,
        description: 'Hip hinge pattern focused on hamstrings',
      },
    ]);

    // Initialize services
    searchService = new ExerciseSearchService();
    llmService = new LLMService();
    resolver = new AiExerciseResolver(searchService, llmService);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clear unresolved exercises after each test
    await UnresolvedExercise.deleteMany({});
  });

  it('should resolve exercises using fuzzy search when match found', async () => {
    const workoutWithPlaceholders: WorkoutWithPlaceholders = {
      name: 'Test Workout',
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          exercises: [
            {
              orderInBlock: 0,
              exerciseName: 'Back Squat', // Exact match
              sets: [
                { setNumber: 1, targetRepsMin: 5, targetRepsMax: 5, weightUnit: 'lbs' },
              ],
            },
          ],
        },
      ],
    };

    const result = await resolver.resolve(workoutWithPlaceholders, 'user-123', 'workout-123');

    // Should have resolved to Back Squat
    expect(result.blocks[0].exercises[0].exerciseId).toBeDefined();
    expect(result.blocks[0].exercises[0].exerciseId).toMatch(/^[a-f0-9]{24}$/);

    // Should NOT have tracked as unresolved (fuzzy search succeeded)
    const unresolvedCount = await UnresolvedExercise.countDocuments();
    expect(unresolvedCount).toBe(0);
  });

  it('should resolve with fuzzy search for typos and variations', async () => {
    const workoutWithPlaceholders: WorkoutWithPlaceholders = {
      name: 'Test Workout',
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          exercises: [
            {
              orderInBlock: 0,
              exerciseName: 'Back Squats', // Plural form
              sets: [
                { setNumber: 1, targetRepsMin: 5, targetRepsMax: 5, weightUnit: 'lbs' },
              ],
            },
            {
              orderInBlock: 1,
              exerciseName: 'RDL', // Abbreviation
              sets: [
                { setNumber: 1, targetRepsMin: 8, targetRepsMax: 8, weightUnit: 'lbs' },
              ],
            },
          ],
        },
      ],
    };

    const result = await resolver.resolve(workoutWithPlaceholders, 'user-123', 'workout-123');

    // Both should be resolved via fuzzy search
    expect(result.blocks[0].exercises[0].exerciseId).toBeDefined();
    expect(result.blocks[0].exercises[1].exerciseId).toBeDefined();

    // Should NOT have tracked as unresolved
    const unresolvedCount = await UnresolvedExercise.countDocuments();
    expect(unresolvedCount).toBe(0);
  });

  it('should use AI when fuzzy search finds nothing and track as unresolved', async () => {
    const workoutWithPlaceholders: WorkoutWithPlaceholders = {
      name: 'Test Workout',
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          exercises: [
            {
              orderInBlock: 0,
              exerciseName: 'Mysterious Jumping Exercise', // No fuzzy match
              sets: [
                { setNumber: 1, targetRepsMin: 10, targetRepsMax: 10, weightUnit: 'lbs' },
              ],
            },
          ],
        },
      ],
    };

    const result = await resolver.resolve(workoutWithPlaceholders, 'user-123', 'workout-123');

    // Should have resolved to something (likely Box Jumps based on "jumping")
    expect(result.blocks[0].exercises[0].exerciseId).toBeDefined();
    expect(result.blocks[0].exercises[0].exerciseId).toMatch(/^[a-f0-9]{24}$/);

    // Should have tracked as unresolved since AI was used
    const unresolvedExercises = await UnresolvedExercise.find();
    expect(unresolvedExercises).toHaveLength(1);
    expect(unresolvedExercises[0].originalName).toBe('Mysterious Jumping Exercise');
    expect(unresolvedExercises[0].userId).toBe('user-123');
    expect(unresolvedExercises[0].workoutId).toBe('workout-123');
  }, 30000); // 30 second timeout for AI call

  it('should work without userId (no tracking)', async () => {
    const workoutWithPlaceholders: WorkoutWithPlaceholders = {
      name: 'Test Workout',
      date: '2024-01-01',
      lastModifiedTime: new Date().toISOString(),
      blocks: [
        {
          exercises: [
            {
              orderInBlock: 0,
              exerciseName: 'Unknown Leg Exercise',
              sets: [
                { setNumber: 1, targetRepsMin: 10, targetRepsMax: 10, weightUnit: 'lbs' },
              ],
            },
          ],
        },
      ],
    };

    const result = await resolver.resolve(workoutWithPlaceholders); // No userId

    // Should have resolved
    expect(result.blocks[0].exercises[0].exerciseId).toBeDefined();

    // Should NOT have tracked (no userId provided)
    const unresolvedCount = await UnresolvedExercise.countDocuments();
    expect(unresolvedCount).toBe(0);
  }, 30000);
});
