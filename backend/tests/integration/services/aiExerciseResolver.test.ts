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

    // Seed database with a small set of leg exercises using new simplified schema
    await Exercise.insertMany([
      {
        name: 'Back Squat',
        slug: 'back-squat',
        tags: ['quads', 'glutes', 'hamstrings', 'barbell', 'squat', 'compound', 'intermediate'],
      },
      {
        name: 'Box Jumps',
        slug: 'box-jumps',
        tags: ['quads', 'glutes', 'calves', 'hamstrings', 'box', 'plyometric', 'compound', 'intermediate'],
      },
      {
        name: 'Romanian Deadlift',
        slug: 'romanian-deadlift',
        tags: ['hamstrings', 'glutes', 'lower-back', 'barbell', 'hinge', 'compound', 'intermediate'],
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
                { setNumber: 1, weightUnit: 'lbs' },
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
                { setNumber: 1, weightUnit: 'lbs' },
              ],
            },
            {
              orderInBlock: 1,
              exerciseName: 'RDL', // Abbreviation
              sets: [
                { setNumber: 1, weightUnit: 'lbs' },
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
});
