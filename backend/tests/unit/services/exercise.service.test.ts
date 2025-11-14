import { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import {
  listExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../../../src/services/exercise.service';
import { AppError } from '../../../src/middleware/errorHandler';

// Mock the ExerciseRepository
jest.mock('../../../src/repositories/ExerciseRepository');

const MockedExerciseRepository = ExerciseRepository as jest.MockedClass<typeof ExerciseRepository>;

describe('Exercise Service', () => {
  let mockRepo: jest.Mocked<ExerciseRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = new MockedExerciseRepository(null as any) as jest.Mocked<ExerciseRepository>;
    // Replace the repository getter with our mock
    (ExerciseRepository as any).mockImplementation(() => mockRepo);
  });

  describe('listExercises', () => {
    it('should return paginated exercises', async () => {
      const mockExercises = [
        {
          id: '1',
          slug: 'barbell-bench-press',
          name: 'Barbell Bench Press',
          tags: ['chest', 'push', 'barbell'],
        },
        {
          id: '2',
          slug: 'dumbbell-bench-press',
          name: 'Dumbbell Bench Press',
          tags: ['chest', 'push', 'dumbbell'],
        },
      ];

      mockRepo.findAll = jest.fn().mockResolvedValue(mockExercises);

      const result = await listExercises({}, { page: 1, limit: 50 });

      expect(result.exercises).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.pages).toBe(1);
      expect(mockRepo.findAll).toHaveBeenCalledWith({
        tags: undefined,
        nameQuery: undefined,
      });
    });

    it('should search exercises by name', async () => {
      mockRepo.findAll = jest.fn().mockResolvedValue([]);

      await listExercises({ search: 'bench' }, { page: 1, limit: 50 });

      expect(mockRepo.findAll).toHaveBeenCalledWith({
        tags: undefined,
        nameQuery: 'bench',
      });
    });

    it('should filter exercises by tag', async () => {
      mockRepo.findAll = jest.fn().mockResolvedValue([]);

      await listExercises({ tag: 'chest' }, { page: 1, limit: 50 });

      expect(mockRepo.findAll).toHaveBeenCalledWith({
        tags: ['chest'],
        nameQuery: undefined,
      });
    });

    it('should paginate results correctly', async () => {
      const mockExercises = Array.from({ length: 100 }, (_, i) => ({
        id: String(i + 1),
        slug: `exercise-${i + 1}`,
        name: `Exercise ${i + 1}`,
        tags: ['test'],
      }));

      mockRepo.findAll = jest.fn().mockResolvedValue(mockExercises);

      // Get page 2 with 10 items per page
      const result = await listExercises({}, { page: 2, limit: 10 });

      expect(result.exercises).toHaveLength(10);
      expect(result.exercises[0].id).toBe('11'); // First item of page 2
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.pages).toBe(10);
    });
  });

  describe('getExerciseById', () => {
    it('should return exercise by numeric ID', async () => {
      const mockExercise = {
        id: '1',
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell'],
      };

      mockRepo.findById = jest.fn().mockResolvedValue(mockExercise);

      const result = await getExerciseById('1');

      expect(result.name).toBe('Barbell Bench Press');
      expect(mockRepo.findById).toHaveBeenCalledWith('1');
    });

    it('should return exercise by slug when numeric ID not found', async () => {
      const mockExercise = {
        id: '1',
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell'],
      };

      mockRepo.findById = jest.fn().mockResolvedValue(null);
      mockRepo.findBySlug = jest.fn().mockResolvedValue(mockExercise);

      const result = await getExerciseById('999');

      expect(result.name).toBe('Barbell Bench Press');
      expect(mockRepo.findById).toHaveBeenCalledWith('999');
      expect(mockRepo.findBySlug).toHaveBeenCalledWith('999');
    });

    it('should find by slug when non-numeric ID provided', async () => {
      const mockExercise = {
        id: '1',
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell'],
      };

      mockRepo.findBySlug = jest.fn().mockResolvedValue(mockExercise);

      const result = await getExerciseById('barbell-bench-press');

      expect(result.name).toBe('Barbell Bench Press');
      expect(mockRepo.findBySlug).toHaveBeenCalledWith('barbell-bench-press');
    });

    it('should throw error when exercise not found by ID or slug', async () => {
      mockRepo.findById = jest.fn().mockResolvedValue(null);
      mockRepo.findBySlug = jest.fn().mockResolvedValue(null);

      await expect(getExerciseById('999')).rejects.toThrow(AppError);
      await expect(getExerciseById('999')).rejects.toThrow('Exercise not found');
    });

    it('should throw error when exercise not found by slug', async () => {
      mockRepo.findBySlug = jest.fn().mockResolvedValue(null);

      await expect(getExerciseById('non-existent-slug')).rejects.toThrow(AppError);
      await expect(getExerciseById('non-existent-slug')).rejects.toThrow('Exercise not found');
    });
  });

  describe('createExercise', () => {
    it('should create exercise with valid data', async () => {
      const mockExercise = {
        id: '1',
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell'],
      };

      mockRepo.checkDuplicateName = jest.fn().mockResolvedValue(false);
      mockRepo.create = jest.fn().mockResolvedValue(mockExercise);

      const result = await createExercise({
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell'],
      });

      expect(result.name).toBe('Barbell Bench Press');
      expect(result.slug).toBe('barbell-bench-press');
      expect(result.tags).toEqual(['chest', 'push', 'barbell']);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.checkDuplicateName).toHaveBeenCalledWith('Barbell Bench Press');
    });

    it('should throw error for duplicate exercise name', async () => {
      mockRepo.checkDuplicateName = jest.fn().mockResolvedValue(true);

      await expect(
        createExercise({
          slug: 'barbell-bench-press',
          name: 'Barbell Bench Press',
          tags: ['chest'],
        })
      ).rejects.toThrow(AppError);
      await expect(
        createExercise({
          slug: 'barbell-bench-press',
          name: 'Barbell Bench Press',
          tags: ['chest'],
        })
      ).rejects.toThrow('Exercise with this name already exists');
    });
  });

  describe('updateExercise', () => {
    it('should update exercise with valid data', async () => {
      const mockExercise = {
        id: '1',
        slug: 'barbell-bench-press-updated',
        name: 'Barbell Bench Press Updated',
        tags: ['chest', 'push'],
      };

      mockRepo.checkDuplicateName = jest.fn().mockResolvedValue(false);
      mockRepo.update = jest.fn().mockResolvedValue(mockExercise);

      const result = await updateExercise('1', {
        name: 'Barbell Bench Press Updated',
      });

      expect(result.name).toBe('Barbell Bench Press Updated');
      expect(mockRepo.update).toHaveBeenCalledWith('1', {
        slug: undefined,
        name: 'Barbell Bench Press Updated',
        tags: undefined,
        needsReview: undefined,
      });
    });

    it('should throw error for non-numeric ID', async () => {
      await expect(updateExercise('invalid-id', { name: 'Test' })).rejects.toThrow(AppError);
      await expect(updateExercise('invalid-id', { name: 'Test' })).rejects.toThrow(
        'Invalid exercise ID'
      );
    });

    it('should throw error when exercise not found', async () => {
      mockRepo.checkDuplicateName = jest.fn().mockResolvedValue(false);
      mockRepo.update = jest.fn().mockResolvedValue(null);

      await expect(updateExercise('1', { name: 'Test' })).rejects.toThrow(AppError);
      await expect(updateExercise('1', { name: 'Test' })).rejects.toThrow('Exercise not found');
    });

    it('should throw error for duplicate exercise name', async () => {
      mockRepo.checkDuplicateName = jest.fn().mockResolvedValue(true);

      await expect(updateExercise('1', { name: 'Existing Exercise' })).rejects.toThrow(AppError);
      await expect(updateExercise('1', { name: 'Existing Exercise' })).rejects.toThrow(
        'Exercise with this name already exists'
      );
    });
  });

  describe('deleteExercise', () => {
    it('should delete exercise by valid ID', async () => {
      mockRepo.delete = jest.fn().mockResolvedValue(true);

      await deleteExercise('1');

      expect(mockRepo.delete).toHaveBeenCalledWith('1');
    });

    it('should throw error for non-numeric ID', async () => {
      await expect(deleteExercise('invalid-id')).rejects.toThrow(AppError);
      await expect(deleteExercise('invalid-id')).rejects.toThrow('Invalid exercise ID');
    });

    it('should throw error when exercise not found', async () => {
      mockRepo.delete = jest.fn().mockResolvedValue(false);

      await expect(deleteExercise('1')).rejects.toThrow(AppError);
      await expect(deleteExercise('1')).rejects.toThrow('Exercise not found');
    });
  });
});
