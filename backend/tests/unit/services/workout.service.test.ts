import { Kysely } from 'kysely';
import { Database } from '../../../src/db/types';
import { WorkoutRepository } from '../../../src/repositories/WorkoutRepository';
import { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import {
  createWorkout,
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
  listWorkouts,
  duplicateWorkout,
  getWorkoutsByDateRange,
  addBlock,
  removeBlock,
  addExercise,
  removeExercise,
  updateSet,
  completeSet,
} from '../../../src/services/workout.service';
import { AppError } from '../../../src/middleware/errorHandler';

// Mock the repositories
jest.mock('../../../src/repositories/WorkoutRepository');
jest.mock('../../../src/repositories/ExerciseRepository');

const MockedWorkoutRepository = WorkoutRepository as jest.MockedClass<typeof WorkoutRepository>;
const MockedExerciseRepository = ExerciseRepository as jest.MockedClass<typeof ExerciseRepository>;

describe('Workout Service', () => {
  let mockWorkoutRepo: jest.Mocked<WorkoutRepository>;
  let mockExerciseRepo: jest.Mocked<ExerciseRepository>;
  let mockDb: Kysely<Database>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {} as Kysely<Database>;
    mockWorkoutRepo = new MockedWorkoutRepository(null as any) as jest.Mocked<WorkoutRepository>;
    mockExerciseRepo = new MockedExerciseRepository(null as any) as jest.Mocked<ExerciseRepository>;
    (WorkoutRepository as any).mockImplementation(() => mockWorkoutRepo);
    (ExerciseRepository as any).mockImplementation(() => mockExerciseRepo);
  });

  const mockUserId = '1';
  const mockWorkoutId = '1';

  describe('createWorkout', () => {
    it('should create a new workout with valid data', async () => {
      const workoutData = {
        name: 'Push Day',
        date: '2025-11-01',
        notes: 'Focus on chest and shoulders',
        blocks: [],
      };

      const mockWorkout = {
        id: mockWorkoutId,
        userId: mockUserId,
        ...workoutData,
        lastModifiedTime: new Date().toISOString(),
      };

      mockWorkoutRepo.create = jest.fn().mockResolvedValue(mockWorkout);

      const result = await createWorkout(mockDb, mockUserId, workoutData);

      expect(result.id).toBe(mockWorkoutId);
      expect(result.name).toBe('Push Day');
      expect(result.date).toBe('2025-11-01');
      expect(mockWorkoutRepo.create).toHaveBeenCalled();
    });
  });

  describe('getWorkoutById', () => {
    it('should return workout by ID with resolved exercise names', async () => {
      const mockWorkout = {
        id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: 'block-1',
            label: 'Main Lift',
            exercises: [
              {
                id: 'exercise-1',
                exerciseId: '1',
                orderInBlock: 0,
                sets: [],
              },
            ],
          },
        ],
      };

      const mockExercise = {
        id: '1',
        slug: 'bench-press',
        name: 'Bench Press',
        tags: ['chest'],
      };

      mockWorkoutRepo.findById = jest.fn().mockResolvedValue(mockWorkout);
      mockExerciseRepo.findById = jest.fn().mockResolvedValue(mockExercise);

      const result = await getWorkoutById(mockDb, mockWorkoutId);

      expect(result.id).toBe(mockWorkoutId);
      expect(result.name).toBe('Push Day');
      expect(mockWorkoutRepo.findById).toHaveBeenCalledWith(mockWorkoutId);
    });

    it('should throw error when workout not found', async () => {
      mockWorkoutRepo.findById = jest.fn().mockResolvedValue(null);

      await expect(getWorkoutById(mockDb, mockWorkoutId)).rejects.toThrow(AppError);
      await expect(getWorkoutById(mockDb, mockWorkoutId)).rejects.toThrow('Workout not found');
    });

    it('should throw error for non-numeric ID', async () => {
      await expect(getWorkoutById(mockDb, 'invalid-id')).rejects.toThrow(AppError);
      await expect(getWorkoutById(mockDb, 'invalid-id')).rejects.toThrow('Invalid workout ID');
    });
  });

  describe('updateWorkout', () => {
    it('should update workout with valid data', async () => {
      const updates = {
        name: 'Updated Push Day',
        notes: 'Updated notes',
      };

      const mockWorkout = {
        id: mockWorkoutId,
        userId: mockUserId,
        name: 'Updated Push Day',
        date: '2025-11-01',
        notes: 'Updated notes',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      };

      mockWorkoutRepo.update = jest.fn().mockResolvedValue(mockWorkout);

      const result = await updateWorkout(mockDb, mockWorkoutId, updates);

      expect(result.name).toBe('Updated Push Day');
      expect(result.notes).toBe('Updated notes');
      expect(mockWorkoutRepo.update).toHaveBeenCalled();
    });

    it('should throw error for non-numeric ID', async () => {
      await expect(updateWorkout(mockDb, 'invalid-id', {})).rejects.toThrow(AppError);
      await expect(updateWorkout(mockDb, 'invalid-id', {})).rejects.toThrow('Invalid workout ID');
    });

    it('should throw error when workout not found', async () => {
      mockWorkoutRepo.update = jest.fn().mockResolvedValue(null);

      await expect(updateWorkout(mockDb, mockWorkoutId, {})).rejects.toThrow(AppError);
      await expect(updateWorkout(mockDb, mockWorkoutId, {})).rejects.toThrow('Workout not found');
    });
  });

  describe('deleteWorkout', () => {
    it('should delete workout by ID', async () => {
      mockWorkoutRepo.delete = jest.fn().mockResolvedValue(true);

      await deleteWorkout(mockDb, mockWorkoutId);

      expect(mockWorkoutRepo.delete).toHaveBeenCalledWith(mockWorkoutId);
    });

    it('should throw error for non-numeric ID', async () => {
      await expect(deleteWorkout(mockDb, 'invalid-id')).rejects.toThrow(AppError);
      await expect(deleteWorkout(mockDb, 'invalid-id')).rejects.toThrow('Invalid workout ID');
    });

    it('should throw error when workout not found', async () => {
      mockWorkoutRepo.delete = jest.fn().mockResolvedValue(false);

      await expect(deleteWorkout(mockDb, mockWorkoutId)).rejects.toThrow(AppError);
      await expect(deleteWorkout(mockDb, mockWorkoutId)).rejects.toThrow('Workout not found');
    });
  });

  describe('listWorkouts', () => {
    it('should return paginated workouts', async () => {
      const mockWorkouts = [
        {
          id: '1',
          userId: mockUserId,
          name: 'Push Day',
          date: '2025-11-01',
          lastModifiedTime: new Date().toISOString(),
          blocks: [],
        },
        {
          id: '2',
          userId: mockUserId,
          name: 'Pull Day',
          date: '2025-11-02',
          lastModifiedTime: new Date().toISOString(),
          blocks: [],
        },
      ];

      mockWorkoutRepo.findByUserId = jest.fn().mockResolvedValue(mockWorkouts);

      const result = await listWorkouts(mockDb, mockUserId, {}, { page: 1, limit: 50 });

      expect(result.workouts).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.pages).toBe(1);
    });

    it('should filter workouts by date range', async () => {
      const mockWorkouts = [
        {
          id: '1',
          userId: mockUserId,
          name: 'Push Day',
          date: '2025-11-01',
          lastModifiedTime: new Date().toISOString(),
          blocks: [],
        },
      ];

      mockWorkoutRepo.findByUserId = jest.fn().mockResolvedValue(mockWorkouts);

      const result = await listWorkouts(
        mockDb,
        mockUserId,
        { dateFrom: '2025-11-01', dateTo: '2025-11-30' },
        { page: 1, limit: 50 }
      );

      expect(result.workouts).toHaveLength(1);
      expect(result.workouts[0].date).toBe('2025-11-01');
    });
  });

  describe('duplicateWorkout', () => {
    it('should duplicate workout with new date', async () => {
      const mockWorkout = {
        id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      };

      const mockDuplicatedWorkout = {
        ...mockWorkout,
        id: '2',
        name: 'Push Day (Copy)',
        date: '2025-11-02',
      };

      mockWorkoutRepo.findById = jest.fn().mockResolvedValue(mockWorkout);
      mockWorkoutRepo.create = jest.fn().mockResolvedValue(mockDuplicatedWorkout);

      const result = await duplicateWorkout(mockDb, mockWorkoutId, mockUserId, '2025-11-02');

      expect(result.id).toBe('2');
      expect(result.name).toBe('Push Day (Copy)');
      expect(result.date).toBe('2025-11-02');
      expect(mockWorkoutRepo.create).toHaveBeenCalled();
    });

    it('should throw error when workout not found', async () => {
      mockWorkoutRepo.findById = jest.fn().mockResolvedValue(null);

      await expect(duplicateWorkout(mockDb, mockWorkoutId, mockUserId, '2025-11-02')).rejects.toThrow(
        AppError
      );
    });
  });

  describe('getWorkoutsByDateRange', () => {
    it('should return workouts within date range', async () => {
      const mockWorkouts = [
        {
          id: '1',
          userId: mockUserId,
          name: 'Push Day',
          date: '2025-11-01',
          lastModifiedTime: new Date().toISOString(),
          blocks: [],
        },
      ];

      mockWorkoutRepo.findByUserId = jest.fn().mockResolvedValue(mockWorkouts);

      const result = await getWorkoutsByDateRange(mockDb, mockUserId, '2025-11-01', '2025-11-30');

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2025-11-01');
    });
  });

  describe('addBlock', () => {
    it('should add block to workout', async () => {
      const mockWorkout = {
        id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      };

      const blockData = {
        label: 'Warm Up',
        exercises: [],
      };

      const updatedWorkout = {
        ...mockWorkout,
        blocks: [{ ...blockData, id: 'block-1', exercises: [] }],
      };

      // First findById returns workout before adding block
      // Second findById (at the end) returns workout after adding block
      mockWorkoutRepo.findById = jest
        .fn()
        .mockResolvedValueOnce(mockWorkout)
        .mockResolvedValueOnce(updatedWorkout);
      mockWorkoutRepo.addBlock = jest.fn().mockResolvedValue(undefined);
      mockWorkoutRepo.update = jest.fn().mockResolvedValue(updatedWorkout);

      const result = await addBlock(mockDb, mockWorkoutId, blockData);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].label).toBe('Warm Up');
      expect(mockWorkoutRepo.addBlock).toHaveBeenCalled();
    });
  });

  describe('removeBlock', () => {
    it('should remove block from workout', async () => {
      const mockWorkout = {
        id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      };

      mockWorkoutRepo.findWorkoutIdByBlockId = jest.fn().mockResolvedValue(mockWorkoutId);
      mockWorkoutRepo.deleteBlock = jest.fn().mockResolvedValue(true);
      mockWorkoutRepo.update = jest.fn().mockResolvedValue(mockWorkout);
      mockWorkoutRepo.findById = jest.fn().mockResolvedValue(mockWorkout);

      const result = await removeBlock(mockDb, 'block-1');

      expect(result.blocks).toHaveLength(0);
      expect(mockWorkoutRepo.deleteBlock).toHaveBeenCalledWith('block-1');
    });
  });

  describe('addExercise', () => {
    it('should add exercise to block', async () => {
      const mockWorkout = {
        id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: 'block-1',
            label: 'Main Lift',
            exercises: [{ id: 'exercise-1', exerciseId: '1', orderInBlock: 0, sets: [] }],
          },
        ],
      };

      const exerciseData = {
        exerciseId: '1',
        orderInBlock: 0,
        sets: [],
      };

      mockWorkoutRepo.findWorkoutIdByBlockId = jest.fn().mockResolvedValue(mockWorkoutId);
      mockWorkoutRepo.addExerciseToBlock = jest.fn().mockResolvedValue(undefined);
      mockWorkoutRepo.update = jest.fn().mockResolvedValue(mockWorkout);
      mockWorkoutRepo.findById = jest.fn().mockResolvedValue(mockWorkout);

      const result = await addExercise(mockDb, 'block-1', exerciseData);

      expect(result.blocks[0].exercises).toHaveLength(1);
      expect(mockWorkoutRepo.addExerciseToBlock).toHaveBeenCalled();
    });
  });

  describe('removeExercise', () => {
    it('should remove exercise from block', async () => {
      const mockWorkout = {
        id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: 'block-1',
            label: 'Main Lift',
            exercises: [],
          },
        ],
      };

      mockWorkoutRepo.findWorkoutIdByExerciseId = jest.fn().mockResolvedValue(mockWorkoutId);
      mockWorkoutRepo.deleteExerciseInstance = jest.fn().mockResolvedValue(true);
      mockWorkoutRepo.update = jest.fn().mockResolvedValue(mockWorkout);
      mockWorkoutRepo.findById = jest.fn().mockResolvedValue(mockWorkout);

      const result = await removeExercise(mockDb, 'exercise-1');

      expect(result.blocks[0].exercises).toHaveLength(0);
      expect(mockWorkoutRepo.deleteExerciseInstance).toHaveBeenCalled();
    });
  });

  describe('updateSet', () => {
    it('should update set in exercise', async () => {
      const mockSet = {
        id: 'set-1',
        setNumber: 1,
        reps: 12,
        weight: 135,
        weightUnit: 'lbs' as const,
      };

      const mockWorkout = {
        id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: 'block-1',
            label: 'Main Lift',
            exercises: [
              {
                id: 'exercise-1',
                exerciseId: '1',
                orderInBlock: 0,
                sets: [mockSet],
              },
            ],
          },
        ],
      };

      mockWorkoutRepo.updateSet = jest.fn().mockResolvedValue({ set: mockSet, workoutId: mockWorkoutId });
      mockWorkoutRepo.update = jest.fn().mockResolvedValue(mockWorkout);
      mockWorkoutRepo.findById = jest.fn().mockResolvedValue(mockWorkout);

      await updateSet(mockDb, 'set-1', { reps: 12 });

      expect(mockWorkoutRepo.updateSet).toHaveBeenCalled();
    });
  });

  describe('completeSet', () => {
    it('should mark set as completed', async () => {
      const mockSet = {
        id: 'set-1',
        setNumber: 1,
        reps: 10,
        weight: 135,
        weightUnit: 'lbs' as const,
        completed: true,
      };

      const mockWorkout = {
        id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: 'block-1',
            label: 'Main Lift',
            exercises: [
              {
                id: 'exercise-1',
                exerciseId: '1',
                orderInBlock: 0,
                sets: [mockSet],
              },
            ],
          },
        ],
      };

      mockWorkoutRepo.updateSet = jest.fn().mockResolvedValue({ set: mockSet, workoutId: mockWorkoutId });
      mockWorkoutRepo.update = jest.fn().mockResolvedValue(mockWorkout);
      mockWorkoutRepo.findById = jest.fn().mockResolvedValue(mockWorkout);

      await completeSet(mockDb, 'set-1', { reps: 10, weight: 135 });

      expect(mockWorkoutRepo.updateSet).toHaveBeenCalled();
    });
  });
});
