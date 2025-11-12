import { AiExerciseResolver } from '../../../src/services/workoutParser/aiExerciseResolver';
import { ExerciseSearchService } from '../../../src/services/exerciseSearch.service';
import { LLMService } from '../../../src/services/llm.service';
import { ExerciseCreationService } from '../../../src/services/exerciseCreation.service';
import { UnresolvedExercise } from '../../../src/models/UnresolvedExercise';
import { WorkoutWithPlaceholders } from '../../../src/services/workoutParser/types';

// Mock dependencies
jest.mock('../../../src/services/exerciseSearch.service');
jest.mock('../../../src/services/llm.service');
jest.mock('../../../src/services/exerciseCreation.service');
jest.mock('../../../src/models/UnresolvedExercise');

const MockedExerciseSearchService = ExerciseSearchService as jest.MockedClass<
  typeof ExerciseSearchService
>;
const MockedLLMService = LLMService as jest.MockedClass<typeof LLMService>;
const MockedExerciseCreationService =
  ExerciseCreationService as jest.MockedClass<typeof ExerciseCreationService>;
const MockedUnresolvedExercise = UnresolvedExercise as jest.Mocked<
  typeof UnresolvedExercise
>;

describe('AiExerciseResolver', () => {
  let resolver: AiExerciseResolver;
  let mockSearchService: jest.Mocked<ExerciseSearchService>;
  let mockLLMService: jest.Mocked<LLMService>;
  let mockCreationService: jest.Mocked<ExerciseCreationService>;

  const mockExercises = {
    reverseLunges: {
      id: '507f1f77bcf86cd799439001',
      slug: 'reverse-lunges',
      name: 'Reverse Lunges',
      tags: ['legs', 'quads', 'glutes', 'bodyweight', 'unilateral', 'strength'],
    },
    barbellReverseLunge: {
      id: '507f1f77bcf86cd799439002',
      slug: 'barbell-reverse-lunge',
      name: 'Barbell Reverse Lunge',
      tags: ['legs', 'quads', 'glutes', 'barbell', 'unilateral'],
    },
    benchPress: {
      id: '507f1f77bcf86cd799439003',
      slug: 'barbell-bench-press',
      name: 'Barbell Bench Press',
      tags: ['chest', 'push', 'barbell', 'fundamental', 'compound'],
    },
    landminePress: {
      id: '507f1f77bcf86cd799439004',
      slug: 'landmine-press',
      name: 'Landmine Press',
      tags: ['chest', 'shoulders', 'barbell', 'push', 'compound'],
      needsReview: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSearchService =
      new MockedExerciseSearchService() as jest.Mocked<ExerciseSearchService>;
    mockLLMService = new MockedLLMService() as jest.Mocked<LLMService>;
    mockCreationService =
      new MockedExerciseCreationService() as jest.Mocked<ExerciseCreationService>;

    resolver = new AiExerciseResolver(
      mockSearchService,
      mockLLMService,
      mockCreationService
    );

    // Mock UnresolvedExercise.create to prevent actual DB writes
    MockedUnresolvedExercise.create = jest.fn().mockResolvedValue({});
  });

  describe('resolve', () => {
    it('should resolve exercises using fuzzy search when match is found', async () => {
      // Mock fuzzy search to return a match
      mockSearchService.searchByName = jest.fn().mockResolvedValue([
        {
          exercise: mockExercises.benchPress,
          score: 0.5,
        },
      ]);

      const workoutWithPlaceholders: WorkoutWithPlaceholders = {
        name: '',
        date: '2024-01-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            exercises: [
              {
                orderInBlock: 0,
                exerciseName: 'Bench Press',
                sets: [
                  { setNumber: 1, reps: 10, weight: 135, weightUnit: 'lbs' },
                ],
              },
            ],
          },
        ],
      };

      const result = await resolver.resolve(
        workoutWithPlaceholders,
        'user-1',
        'workout-1'
      );

      expect(result.blocks[0].exercises[0].exerciseId).toBe(
        mockExercises.benchPress.id
      );
      expect(mockSearchService.searchByName).toHaveBeenCalledWith(
        'Bench Press',
        { 'threshold': 0.5 },
      );
      // Should NOT call LLM if fuzzy search succeeds
      expect(mockLLMService.callWithTools).not.toHaveBeenCalled();
      // Should NOT track as unresolved if fuzzy search succeeds
      expect(MockedUnresolvedExercise.create).not.toHaveBeenCalled();
    });

    it('should fall back to AI when fuzzy search finds no results', async () => {
      // Mock fuzzy search to return no results
      mockSearchService.searchByName = jest
        .fn()
        .mockResolvedValueOnce([]) // First call (fuzzy search) returns nothing
        .mockResolvedValueOnce([
          // Second call (AI search) returns results
          {
            exercise: mockExercises.reverseLunges,
            score: 0.3,
          },
        ]);

      // Mock AI to select the exercise
      mockLLMService.callWithTools = jest
        .fn()
        .mockImplementation(
          async (_systemPrompt, _userMessage, _tools, toolHandler) => {
            // Simulate AI calling search_exercises tool
            await toolHandler('search_exercises', {
              query: 'reverse lunge',
              limit: 10,
            });

            // Simulate AI calling select_exercise tool
            await toolHandler('select_exercise', {
              exercise_id: mockExercises.reverseLunges.id,
              reasoning:
                'Best match for reverse lunges with alternating modifier',
            });

            return {
              content: {
                exerciseId: mockExercises.reverseLunges.id,
                wasCreated: false,
              },
              raw: {} as any,
            };
          }
        );

      const workoutWithPlaceholders: WorkoutWithPlaceholders = {
        name: '',
        date: '2024-01-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            exercises: [
              {
                orderInBlock: 0,
                exerciseName: 'Reverse Lunges (alternating)',
                sets: [
                  { setNumber: 1, reps: 10, weight: 0, weightUnit: 'lbs' },
                ],
              },
            ],
          },
        ],
      };

      const result = await resolver.resolve(
        workoutWithPlaceholders,
        'user-1',
        'workout-1'
      );

      expect(result.blocks[0].exercises[0].exerciseId).toBe(
        mockExercises.reverseLunges.id
      );
      expect(mockLLMService.callWithTools).toHaveBeenCalled();
      // Should track as unresolved when AI is used
      expect(MockedUnresolvedExercise.create).toHaveBeenCalledWith({
        originalName: 'Reverse Lunges (alternating)',
        resolvedExerciseId: mockExercises.reverseLunges.id,
        userId: 'user-1',
        workoutId: 'workout-1',
      });
    });

    it('should handle multiple exercises in a workout', async () => {
      mockSearchService.searchByName = jest
        .fn()
        .mockResolvedValueOnce([
          {
            exercise: mockExercises.benchPress,
            score: 0.1,
          },
        ])
        .mockResolvedValueOnce([
          {
            exercise: mockExercises.reverseLunges,
            score: 0.2,
          },
        ]);

      const workoutWithPlaceholders: WorkoutWithPlaceholders = {
        name: '',
        date: '2024-01-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            exercises: [
              {
                orderInBlock: 0,
                exerciseName: 'Bench Press',
                sets: [
                  { setNumber: 1, reps: 10, weight: 135, weightUnit: 'lbs' },
                ],
              },
              {
                orderInBlock: 1,
                exerciseName: 'Reverse Lunges',
                sets: [
                  { setNumber: 1, reps: 12, weight: 0, weightUnit: 'lbs' },
                ],
              },
            ],
          },
        ],
      };

      const result = await resolver.resolve(
        workoutWithPlaceholders,
        'user-1',
        'workout-1'
      );

      expect(result.blocks[0].exercises[0].exerciseId).toBe(
        mockExercises.benchPress.id
      );
      expect(result.blocks[0].exercises[1].exerciseId).toBe(
        mockExercises.reverseLunges.id
      );
      expect(mockSearchService.searchByName).toHaveBeenCalledTimes(2);
    });

    it('should work without userId (no tracking)', async () => {
      mockSearchService.searchByName = jest
        .fn()
        .mockResolvedValueOnce([]) // Fuzzy search fails
        .mockResolvedValueOnce([
          {
            exercise: mockExercises.reverseLunges,
            score: 0.3,
          },
        ]);

      mockLLMService.callWithTools = jest
        .fn()
        .mockImplementation(
          async (_systemPrompt, _userMessage, _tools, toolHandler) => {
            await toolHandler('search_exercises', {
              query: 'reverse lunge',
              limit: 10,
            });
            await toolHandler('select_exercise', {
              exercise_id: mockExercises.reverseLunges.id,
              reasoning: 'Match found',
            });
            return {
              content: {
                exerciseId: mockExercises.reverseLunges.id,
                wasCreated: false,
              },
              raw: {} as any,
            };
          }
        );

      const workoutWithPlaceholders: WorkoutWithPlaceholders = {
        name: '',
        date: '2024-01-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            exercises: [
              {
                orderInBlock: 0,
                exerciseName: 'Reverse Lunges (alternating)',
                sets: [
                  { setNumber: 1, reps: 10, weight: 0, weightUnit: 'lbs' },
                ],
              },
            ],
          },
        ],
      };

      // Call without userId
      const result = await resolver.resolve(workoutWithPlaceholders);

      expect(result.blocks[0].exercises[0].exerciseId).toBe(
        mockExercises.reverseLunges.id
      );
      // Should NOT track when no userId provided
      expect(MockedUnresolvedExercise.create).not.toHaveBeenCalled();
    });

    it('should throw error when AI fails to find a match', async () => {
      mockSearchService.searchByName = jest.fn().mockResolvedValue([]);

      mockLLMService.callWithTools = jest
        .fn()
        .mockImplementation(
          async (_systemPrompt, _userMessage, _tools, toolHandler) => {
            // AI searches but doesn't call select_exercise
            await toolHandler('search_exercises', {
              query: 'nonexistent exercise',
              limit: 10,
            });
            // Don't call select_exercise - simulate AI failure
            // This would cause the real implementation to throw an error
            throw new Error('LLM response contains no text or tool use');
          }
        );

      const workoutWithPlaceholders: WorkoutWithPlaceholders = {
        name: '',
        date: '2024-01-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            exercises: [
              {
                orderInBlock: 0,
                exerciseName: 'Nonexistent Exercise XYZ',
                sets: [
                  { setNumber: 1, reps: 10, weight: 0, weightUnit: 'lbs' },
                ],
              },
            ],
          },
        ],
      };

      await expect(
        resolver.resolve(workoutWithPlaceholders, 'user-1')
      ).rejects.toThrow('Failed to resolve exercise');
    });
  });

  describe('AI tool usage', () => {
    it('should provide search tool that returns exercise details', async () => {
      mockSearchService.searchByName = jest
        .fn()
        .mockResolvedValueOnce([]) // Fuzzy search fails
        .mockResolvedValueOnce([
          {
            exercise: mockExercises.reverseLunges,
            score: 0.3,
          },
          {
            exercise: mockExercises.barbellReverseLunge,
            score: 0.4,
          },
        ]);

      let searchResults: any = null;

      mockLLMService.callWithTools = jest
        .fn()
        .mockImplementation(
          async (_systemPrompt, _userMessage, _tools, toolHandler) => {
            searchResults = await toolHandler('search_exercises', {
              query: 'reverse lunge',
              limit: 10,
            });

            await toolHandler('select_exercise', {
              exercise_id: mockExercises.reverseLunges.id,
              reasoning: 'Best match',
            });

            return { content: {}, raw: {} as any };
          }
        );

      const workoutWithPlaceholders: WorkoutWithPlaceholders = {
        name: '',
        date: '2024-01-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            exercises: [
              {
                orderInBlock: 0,
                exerciseName: 'Reverse Lunges (alternating)',
                sets: [
                  { setNumber: 1, reps: 10, weight: 0, weightUnit: 'lbs' },
                ],
              },
            ],
          },
        ],
      };

      await resolver.resolve(workoutWithPlaceholders, 'user-1');

      expect(searchResults).toEqual({
        results: [
          {
            id: mockExercises.reverseLunges.id,
            name: mockExercises.reverseLunges.name,
            slug: mockExercises.reverseLunges.slug,
            tags: mockExercises.reverseLunges.tags,
            score: 0.3,
          },
          {
            id: mockExercises.barbellReverseLunge.id,
            name: mockExercises.barbellReverseLunge.name,
            slug: mockExercises.barbellReverseLunge.slug,
            tags: mockExercises.barbellReverseLunge.tags,
            score: 0.4,
          },
        ],
        count: 2,
      });
    });
  });

  describe('create_exercise tool', () => {
    it('should create a new exercise when AI calls create_exercise tool', async () => {
      // Mock fuzzy search to return no results
      mockSearchService.searchByName = jest.fn().mockResolvedValue([]);

      // Mock exercise creation service
      mockCreationService.createPlainExercise = jest
        .fn()
        .mockResolvedValue(mockExercises.landminePress);

      // Mock AI to call create_exercise tool
      mockLLMService.callWithTools = jest
        .fn()
        .mockImplementation(
          async (_systemPrompt, _userMessage, _tools, toolHandler) => {
            // Simulate AI calling search_exercises and finding nothing good
            await toolHandler('search_exercises', {
              query: 'landmine press',
              limit: 10,
            });

            // Simulate AI calling create_exercise tool
            await toolHandler('create_exercise', {
              exercise_name: 'Landmine Press',
            });

            return {
              content: {
                exerciseId: mockExercises.landminePress.id,
                wasCreated: true,
              },
              raw: {} as any,
            };
          }
        );

      const workoutWithPlaceholders: WorkoutWithPlaceholders = {
        name: '',
        date: '2024-01-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            exercises: [
              {
                orderInBlock: 0,
                exerciseName: 'Landmine Press',
                sets: [
                  { setNumber: 1, reps: 8, weight: 95, weightUnit: 'lbs' },
                ],
              },
            ],
          },
        ],
      };

      const result = await resolver.resolve(
        workoutWithPlaceholders,
        'user-1',
        'workout-1'
      );

      expect(result.blocks[0].exercises[0].exerciseId).toBe(
        mockExercises.landminePress.id
      );
      expect(mockCreationService.createPlainExercise).toHaveBeenCalledWith(
        'Landmine Press'
      );
      // Should NOT track as unresolved when creating new exercise
      expect(MockedUnresolvedExercise.create).not.toHaveBeenCalled();
    });

    it('should limit AI search attempts to maximum of 5', async () => {
      mockSearchService.searchByName = jest.fn().mockResolvedValue([]);

      let searchCount = 0;
      mockLLMService.callWithTools = jest
        .fn()
        .mockImplementation(
          async (_systemPrompt, _userMessage, _tools, toolHandler) => {
            // Simulate AI calling search multiple times
            for (let i = 0; i < 10; i++) {
              try {
                await toolHandler('search_exercises', {
                  query: `search attempt ${i}`,
                  limit: 10,
                });
                searchCount++;
              } catch (error) {
                // Should throw error when limit is reached
                break;
              }
            }

            // After hitting limit, should be forced to create or select
            mockCreationService.createPlainExercise = jest
              .fn()
              .mockResolvedValue(mockExercises.landminePress);

            await toolHandler('create_exercise', {
              exercise_name: 'Some Exercise',
            });

            return {
              content: {
                exerciseId: mockExercises.landminePress.id,
                wasCreated: true,
              },
              raw: {} as any,
            };
          }
        );

      const workoutWithPlaceholders: WorkoutWithPlaceholders = {
        name: '',
        date: '2024-01-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            exercises: [
              {
                orderInBlock: 0,
                exerciseName: 'Some Exercise',
                sets: [
                  { setNumber: 1, reps: 10, weight: 0, weightUnit: 'lbs' },
                ],
              },
            ],
          },
        ],
      };

      await resolver.resolve(workoutWithPlaceholders, 'user-1');

      // Should have limited searches to 5
      expect(searchCount).toBeLessThanOrEqual(5);
    });

    it('should only select existing exercises if they truly match', async () => {
      // This test verifies the updated prompting
      // Mock fuzzy search to return a close but not exact match
      mockSearchService.searchByName = jest
        .fn()
        .mockResolvedValueOnce([]) // Fuzzy search fails
        .mockResolvedValueOnce([
          {
            exercise: mockExercises.benchPress,
            score: 0.7, // Not a great match
          },
        ]);

      // Mock AI to prefer creating over selecting a poor match
      mockLLMService.callWithTools = jest
        .fn()
        .mockImplementation(
          async (_systemPrompt, _userMessage, _tools, toolHandler) => {
            // AI searches and finds bench press
            await toolHandler('search_exercises', {
              query: 'landmine press',
              limit: 10,
            });

            // But decides to create instead since it's not a true match
            mockCreationService.createPlainExercise = jest
              .fn()
              .mockResolvedValue(mockExercises.landminePress);

            await toolHandler('create_exercise', {
              exercise_name: 'Landmine Press',
            });

            return {
              content: {
                exerciseId: mockExercises.landminePress.id,
                wasCreated: true,
              },
              raw: {} as any,
            };
          }
        );

      const workoutWithPlaceholders: WorkoutWithPlaceholders = {
        name: '',
        date: '2024-01-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            exercises: [
              {
                orderInBlock: 0,
                exerciseName: 'Landmine Press',
                sets: [
                  { setNumber: 1, reps: 8, weight: 95, weightUnit: 'lbs' },
                ],
              },
            ],
          },
        ],
      };

      const result = await resolver.resolve(workoutWithPlaceholders, 'user-1');

      // Should create new exercise, not use bench press
      expect(result.blocks[0].exercises[0].exerciseId).toBe(
        mockExercises.landminePress.id
      );
      expect(mockCreationService.createPlainExercise).toHaveBeenCalled();
    });
  });
});
