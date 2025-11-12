import mongoose from 'mongoose';
import { Exercise } from '../../../src/models/Exercise';
import {
  listExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../../../src/services/exercise.service';
import { AppError } from '../../../src/middleware/errorHandler';

// Mock the Exercise model
jest.mock('../../../src/models/Exercise');

const MockedExercise = Exercise as jest.Mocked<typeof Exercise>;

describe('Exercise Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listExercises', () => {
    it('should return paginated exercises', async () => {
      const mockExercises = [
        {
          _id: new mongoose.Types.ObjectId(),
          slug: 'barbell-bench-press',
          name: 'Barbell Bench Press',
          tags: ['chest', 'push', 'barbell'],
        },
        {
          _id: new mongoose.Types.ObjectId(),
          slug: 'dumbbell-bench-press',
          name: 'Dumbbell Bench Press',
          tags: ['chest', 'push', 'dumbbell'],
        },
      ];

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockExercises),
      };

      MockedExercise.find.mockReturnValue(mockFind as any);
      MockedExercise.countDocuments.mockResolvedValue(2 as never);

      const result = await listExercises({}, { page: 1, limit: 50 });

      expect(result.exercises).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.pages).toBe(1);
      expect(MockedExercise.find).toHaveBeenCalledWith({});
    });

    it('should search exercises by name', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      MockedExercise.find.mockReturnValue(mockFind as any);
      MockedExercise.countDocuments.mockResolvedValue(0 as never);

      await listExercises({ search: 'bench' }, { page: 1, limit: 50 });

      expect(MockedExercise.find).toHaveBeenCalledWith({
        name: { $regex: 'bench', $options: 'i' },
      });
    });

    it('should filter exercises by tag', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      MockedExercise.find.mockReturnValue(mockFind as any);
      MockedExercise.countDocuments.mockResolvedValue(0 as never);

      await listExercises({ tag: 'chest' }, { page: 1, limit: 50 });

      expect(MockedExercise.find).toHaveBeenCalledWith({ tags: 'chest' });
    });
  });

  describe('getExerciseById', () => {
    it('should return exercise by valid ID', async () => {
      const mockId = new mongoose.Types.ObjectId();
      const mockExercise = {
        _id: mockId,
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell'],
      };

      MockedExercise.findById.mockResolvedValue(mockExercise as any);

      const result = await getExerciseById(mockId.toString());

      expect(result.name).toBe('Barbell Bench Press');
      expect(MockedExercise.findById).toHaveBeenCalledWith(mockId.toString());
    });

    it('should throw error when exercise not found by ID or slug', async () => {
      // Mock findById to return null (invalid ObjectId triggers slug lookup)
      MockedExercise.findById.mockResolvedValue(null);
      // Mock findOne (slug lookup) to also return null
      MockedExercise.findOne.mockResolvedValue(null);

      await expect(getExerciseById('invalid-id')).rejects.toThrow(AppError);
      await expect(getExerciseById('invalid-id')).rejects.toThrow('Exercise not found');
    });

    it('should throw error when exercise not found', async () => {
      const mockId = new mongoose.Types.ObjectId();
      MockedExercise.findById.mockResolvedValue(null);

      await expect(getExerciseById(mockId.toString())).rejects.toThrow(AppError);
      await expect(getExerciseById(mockId.toString())).rejects.toThrow('Exercise not found');
    });
  });

  describe('createExercise', () => {
    it('should create exercise with valid data', async () => {
      const mockExercise = {
        _id: new mongoose.Types.ObjectId(),
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell'],
      };

      MockedExercise.findOne.mockResolvedValue(null);
      MockedExercise.create.mockResolvedValue(mockExercise as any);

      const result = await createExercise({
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell'],
      });

      expect(result.name).toBe('Barbell Bench Press');
      expect(result.slug).toBe('barbell-bench-press');
      expect(result.tags).toEqual(['chest', 'push', 'barbell']);
      expect(MockedExercise.create).toHaveBeenCalled();
    });

    it('should throw error for duplicate exercise name', async () => {
      const mockExercise = {
        _id: new mongoose.Types.ObjectId(),
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
      };

      MockedExercise.findOne.mockResolvedValue(mockExercise as any);

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
      const mockId = new mongoose.Types.ObjectId();
      const mockExercise = {
        _id: mockId,
        slug: 'barbell-bench-press-updated',
        name: 'Barbell Bench Press Updated',
        tags: ['chest', 'push'],
      };

      MockedExercise.findOne.mockResolvedValue(null);
      MockedExercise.findByIdAndUpdate.mockResolvedValue(mockExercise as any);

      const result = await updateExercise(mockId.toString(), {
        name: 'Barbell Bench Press Updated',
      });

      expect(result.name).toBe('Barbell Bench Press Updated');
      expect(MockedExercise.findByIdAndUpdate).toHaveBeenCalledWith(
        mockId.toString(),
        { name: 'Barbell Bench Press Updated' },
        { new: true, runValidators: true }
      );
    });

    it('should throw error for invalid ID', async () => {
      await expect(updateExercise('invalid-id', { name: 'Test' })).rejects.toThrow(AppError);
      await expect(updateExercise('invalid-id', { name: 'Test' })).rejects.toThrow(
        'Invalid exercise ID'
      );
    });

    it('should throw error when exercise not found', async () => {
      const mockId = new mongoose.Types.ObjectId();
      MockedExercise.findOne.mockResolvedValue(null);
      MockedExercise.findByIdAndUpdate.mockResolvedValue(null);

      await expect(updateExercise(mockId.toString(), { name: 'Test' })).rejects.toThrow(AppError);
      await expect(updateExercise(mockId.toString(), { name: 'Test' })).rejects.toThrow(
        'Exercise not found'
      );
    });

    it('should throw error for duplicate exercise name', async () => {
      const mockId = new mongoose.Types.ObjectId();
      const existingExercise = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Existing Exercise',
      };

      MockedExercise.findOne.mockResolvedValue(existingExercise as any);

      await expect(
        updateExercise(mockId.toString(), { name: 'Existing Exercise' })
      ).rejects.toThrow(AppError);
      await expect(
        updateExercise(mockId.toString(), { name: 'Existing Exercise' })
      ).rejects.toThrow('Exercise with this name already exists');
    });
  });

  describe('deleteExercise', () => {
    it('should delete exercise by valid ID', async () => {
      const mockId = new mongoose.Types.ObjectId();
      const mockExercise = {
        _id: mockId,
        name: 'Barbell Bench Press',
      };

      MockedExercise.findByIdAndDelete.mockResolvedValue(mockExercise as any);

      await deleteExercise(mockId.toString());

      expect(MockedExercise.findByIdAndDelete).toHaveBeenCalledWith(mockId.toString());
    });

    it('should throw error for invalid ID', async () => {
      await expect(deleteExercise('invalid-id')).rejects.toThrow(AppError);
      await expect(deleteExercise('invalid-id')).rejects.toThrow('Invalid exercise ID');
    });

    it('should throw error when exercise not found', async () => {
      const mockId = new mongoose.Types.ObjectId();
      MockedExercise.findByIdAndDelete.mockResolvedValue(null);

      await expect(deleteExercise(mockId.toString())).rejects.toThrow(AppError);
      await expect(deleteExercise(mockId.toString())).rejects.toThrow('Exercise not found');
    });
  });
});
