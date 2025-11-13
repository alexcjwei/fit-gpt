import { ExerciseCreationService } from '../../../src/services/exerciseCreation.service';
import { LLMService } from '../../../src/services/llm.service';
import { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import { Exercise as ExerciseType } from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/services/llm.service');

const MockedLLMService = LLMService as jest.MockedClass<typeof LLMService>;

describe('ExerciseCreationService', () => {
  let service: ExerciseCreationService;
  let mockLLMService: jest.Mocked<LLMService>;
  let mockRepository: jest.Mocked<ExerciseRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock LLM service
    mockLLMService = new MockedLLMService() as jest.Mocked<LLMService>;

    // Create mock repository
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      filter: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByName: jest.fn(),
      searchByName: jest.fn(),
      findByTag: jest.fn(),
    } as any;

    service = new ExerciseCreationService(mockLLMService, mockRepository);
  });

  describe('createPlainExercise', () => {
    it('should create a plain exercise with generated slug and needsReview=true', async () => {
      const exerciseName = 'Landmine Press';

      const mockCreatedExercise: ExerciseType = {
        id: '1',
        slug: 'landminepress',
        name: 'Landmine Press',
        tags: [],
        needsReview: true,
      };

      mockRepository.create.mockResolvedValue(mockCreatedExercise);

      const result = await service.createPlainExercise(exerciseName);

      // Verify repository.create was called with correct data
      expect(mockRepository.create).toHaveBeenCalledWith({
        slug: 'landminepress',
        name: 'Landmine Press',
        tags: [],
        needsReview: true,
      });

      expect(result).toEqual(mockCreatedExercise);
    });

    it('should handle exercise names with spaces correctly', async () => {
      const exerciseName = 'Cable Tricep Pushdown';

      const mockCreatedExercise: ExerciseType = {
        id: '2',
        slug: 'cabletriceppushdown',
        name: 'Cable Tricep Pushdown',
        tags: [],
        needsReview: true,
      };

      mockRepository.create.mockResolvedValue(mockCreatedExercise);

      await service.createPlainExercise(exerciseName);

      expect(mockRepository.create).toHaveBeenCalledWith({
        slug: 'cabletriceppushdown',
        name: 'Cable Tricep Pushdown',
        tags: [],
        needsReview: true,
      });
    });

    it('should throw error for invalid exercise name (no letters)', async () => {
      const exerciseName = '123 456';

      await expect(service.createPlainExercise(exerciseName)).rejects.toThrow(
        'Could not build valid slug from exerciseName'
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
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

      const mockCreatedExercise: ExerciseType = {
        id: '1',
        slug: 'landmine-press',
        name: 'Landmine Press',
        tags: ['chest', 'shoulders', 'barbell', 'push', 'compound'],
        needsReview: true,
      };

      mockRepository.create.mockResolvedValue(mockCreatedExercise);

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

      // Verify repository.create was called with needsReview=true
      expect(mockRepository.create).toHaveBeenCalledWith({
        slug: 'landmine-press',
        name: 'Landmine Press',
        tags: ['chest', 'shoulders', 'barbell', 'push', 'compound'],
        needsReview: true,
      });

      // Verify returned exercise has correct structure
      expect(result).toEqual(mockCreatedExercise);
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

      const mockCreatedExercise: ExerciseType = {
        id: '2',
        slug: 'dumbbell-press-alternating',
        name: 'Dumbbell Press (Alternating)',
        tags: ['chest', 'shoulders', 'dumbbell', 'push', 'unilateral'],
        needsReview: true,
      };

      mockRepository.create.mockResolvedValue(mockCreatedExercise);

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

      const mockCreatedExercise: ExerciseType = {
        id: '3',
        slug: 'cable-tricep-pushdown',
        name: 'Cable Tricep Pushdown',
        tags: ['triceps', 'arms', 'cable', 'push', 'isolation'],
        needsReview: true,
      };

      mockRepository.create.mockResolvedValue(mockCreatedExercise);

      const result = await service.createExerciseFromLLM(exerciseName);

      expect(result.tags).toContain('triceps');
      expect(result.tags).toContain('cable');
      expect(result.needsReview).toBe(true);
    });

    it('should throw error when LLM fails', async () => {
      const exerciseName = 'Some Exercise';

      mockLLMService.call = jest.fn().mockRejectedValue(new Error('LLM API error'));

      await expect(service.createExerciseFromLLM(exerciseName)).rejects.toThrow('LLM API error');
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

      mockRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createExerciseFromLLM(exerciseName)).rejects.toThrow('Database error');
    });
  });
});
