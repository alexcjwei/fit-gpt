import { AiExerciseResolver } from '../../../src/services/workoutParser/aiExerciseResolver';
import { ExerciseSearchService } from '../../../src/services/exerciseSearch.service';
import { LLMService } from '../../../src/services/llm.service';
import { UnresolvedExercise } from '../../../src/models/UnresolvedExercise';
import { WorkoutWithPlaceholders } from '../../../src/services/workoutParser/types';

// Mock dependencies
jest.mock('../../../src/services/exerciseSearch.service');
jest.mock('../../../src/services/llm.service');
jest.mock('../../../src/models/UnresolvedExercise');

const MockedExerciseSearchService =
  ExerciseSearchService as jest.MockedClass<typeof ExerciseSearchService>;
const MockedLLMService = LLMService as jest.MockedClass<typeof LLMService>;
const MockedUnresolvedExercise = UnresolvedExercise as jest.Mocked<
  typeof UnresolvedExercise
>;

describe('AiExerciseResolver', () => {
  let resolver: AiExerciseResolver;
  let mockSearchService: jest.Mocked<ExerciseSearchService>;
  let mockLLMService: jest.Mocked<LLMService>;

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
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSearchService = new MockedExerciseSearchService() as jest.Mocked<ExerciseSearchService>;
    mockLLMService = new MockedLLMService() as jest.Mocked<LLMService>;

    resolver = new AiExerciseResolver(mockSearchService, mockLLMService);

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

      const result = await resolver.resolve(workoutWithPlaceholders, 'user-1', 'workout-1');

      expect(result.blocks[0].exercises[0].exerciseId).toBe(
        mockExercises.benchPress.id
      );
      expect(mockSearchService.searchByName).toHaveBeenCalledWith('Bench Press');
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
      mockLLMService.callWithTools = jest.fn().mockImplementation(
        async (_systemPrompt, _userMessage, _tools, toolHandler) => {
          // Simulate AI calling search_exercises tool
          await toolHandler('search_exercises', {
            query: 'reverse lunge',
            limit: 10,
          });

          // Simulate AI calling select_exercise tool
          await toolHandler('select_exercise', {
            exercise_id: mockExercises.reverseLunges.id,
            reasoning: 'Best match for reverse lunges with alternating modifier',
          });

          return {
            content: mockExercises.reverseLunges.id,
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

      const result = await resolver.resolve(workoutWithPlaceholders, 'user-1', 'workout-1');

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

      const result = await resolver.resolve(workoutWithPlaceholders, 'user-1', 'workout-1');

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

      mockLLMService.callWithTools = jest.fn().mockImplementation(
        async (_systemPrompt, _userMessage, _tools, toolHandler) => {
          await toolHandler('search_exercises', {
            query: 'reverse lunge',
            limit: 10,
          });
          await toolHandler('select_exercise', {
            exercise_id: mockExercises.reverseLunges.id,
            reasoning: 'Match found',
          });
          return { content: mockExercises.reverseLunges.id, raw: {} as any };
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

      mockLLMService.callWithTools = jest.fn().mockImplementation(
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
      ).rejects.toThrow('No exercise found matching');
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

      mockLLMService.callWithTools = jest.fn().mockImplementation(
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
});
