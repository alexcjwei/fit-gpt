import { ExerciseCreationService } from '../../../src/services/exerciseCreation.service';
import { LLMService } from '../../../src/services/llm.service';
import { Exercise } from '../../../src/models/Exercise';

// Mock dependencies
jest.mock('../../../src/services/llm.service');
jest.mock('../../../src/models/Exercise');

const MockedLLMService = LLMService as jest.MockedClass<typeof LLMService>;
const MockedExercise = Exercise as jest.Mocked<typeof Exercise>;

describe('ExerciseCreationService', () => {
  let service: ExerciseCreationService;
  let mockLLMService: jest.Mocked<LLMService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLLMService = new MockedLLMService() as jest.Mocked<LLMService>;
    service = new ExerciseCreationService(mockLLMService);
  });

  describe('createExerciseFromLLM', () => {
    it('should create an exercise with LLM-generated fields and needsReview=true', async () => {
      const exerciseName = 'Landmine Press';

      // Mock LLM to return properly formatted exercise data
      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          slug: 'landmine-press',
          name: 'Landmine Press',
          tags: ['chest', 'shoulders', 'barbell', 'push', 'compound'],
        },
        raw: {} as any,
      });

      // Mock Exercise.create to return created exercise
      const mockCreatedExercise = {
        _id: '507f1f77bcf86cd799439011',
        slug: 'landmine-press',
        name: 'Landmine Press',
        tags: ['chest', 'shoulders', 'barbell', 'push', 'compound'],
        needsReview: true,
        toObject: function () {
          return {
            id: this._id.toString(),
            slug: this.slug,
            name: this.name,
            tags: this.tags,
            needsReview: this.needsReview,
          };
        },
      };

      MockedExercise.create = jest.fn().mockResolvedValue(mockCreatedExercise);

      const result = await service.createExerciseFromLLM(exerciseName);

      // Verify LLM was called with exercise name
      expect(mockLLMService.call).toHaveBeenCalledWith(
        expect.stringContaining('Generate exercise metadata'),
        expect.stringContaining(exerciseName),
        'haiku',
        expect.objectContaining({
          jsonMode: true,
          temperature: 0.1,
        })
      );

      // Verify Exercise.create was called with needsReview=true
      expect(MockedExercise.create).toHaveBeenCalledWith({
        slug: 'landmine-press',
        name: 'Landmine Press',
        tags: ['chest', 'shoulders', 'barbell', 'push', 'compound'],
        needsReview: true,
      });

      // Verify returned exercise has correct structure
      expect(result).toEqual({
        id: '507f1f77bcf86cd799439011',
        slug: 'landmine-press',
        name: 'Landmine Press',
        tags: ['chest', 'shoulders', 'barbell', 'push', 'compound'],
        needsReview: true,
      });
    });

    it('should handle exercise names with special characters', async () => {
      const exerciseName = 'DB Press (alternating)';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          slug: 'dumbbell-press-alternating',
          name: 'Dumbbell Press (Alternating)',
          tags: ['chest', 'shoulders', 'dumbbell', 'push', 'unilateral'],
        },
        raw: {} as any,
      });

      const mockCreatedExercise = {
        _id: '507f1f77bcf86cd799439012',
        slug: 'dumbbell-press-alternating',
        name: 'Dumbbell Press (Alternating)',
        tags: ['chest', 'shoulders', 'dumbbell', 'push', 'unilateral'],
        needsReview: true,
        toObject: function () {
          return {
            id: this._id.toString(),
            slug: this.slug,
            name: this.name,
            tags: this.tags,
            needsReview: this.needsReview,
          };
        },
      };

      MockedExercise.create = jest.fn().mockResolvedValue(mockCreatedExercise);

      const result = await service.createExerciseFromLLM(exerciseName);

      expect(result.slug).toBe('dumbbell-press-alternating');
      expect(result.name).toBe('Dumbbell Press (Alternating)');
      expect(result.needsReview).toBe(true);
    });

    it('should generate appropriate tags based on exercise type', async () => {
      const exerciseName = 'Cable Tricep Pushdown';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          slug: 'cable-tricep-pushdown',
          name: 'Cable Tricep Pushdown',
          tags: ['triceps', 'arms', 'cable', 'push', 'isolation'],
        },
        raw: {} as any,
      });

      const mockCreatedExercise = {
        _id: '507f1f77bcf86cd799439013',
        slug: 'cable-tricep-pushdown',
        name: 'Cable Tricep Pushdown',
        tags: ['triceps', 'arms', 'cable', 'push', 'isolation'],
        needsReview: true,
        toObject: function () {
          return {
            id: this._id.toString(),
            slug: this.slug,
            name: this.name,
            tags: this.tags,
            needsReview: this.needsReview,
          };
        },
      };

      MockedExercise.create = jest.fn().mockResolvedValue(mockCreatedExercise);

      const result = await service.createExerciseFromLLM(exerciseName);

      expect(result.tags).toContain('triceps');
      expect(result.tags).toContain('cable');
      expect(result.needsReview).toBe(true);
    });

    it('should throw error when LLM fails', async () => {
      const exerciseName = 'Some Exercise';

      mockLLMService.call = jest
        .fn()
        .mockRejectedValue(new Error('LLM API error'));

      await expect(service.createExerciseFromLLM(exerciseName)).rejects.toThrow(
        'LLM API error'
      );
    });

    it('should throw error when database create fails', async () => {
      const exerciseName = 'Some Exercise';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          slug: 'some-exercise',
          name: 'Some Exercise',
          tags: ['misc'],
        },
        raw: {} as any,
      });

      MockedExercise.create = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(service.createExerciseFromLLM(exerciseName)).rejects.toThrow(
        'Database error'
      );
    });
  });
});
