import {
  createWorkoutService,
  type WorkoutService,
} from '../../../src/services/workout.service';
import type { WorkoutRepository } from '../../../src/repositories/WorkoutRepository';
import type { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import { AppError } from '../../../src/middleware/errorHandler';

describe('Workout Service', () => {
  let mockWorkoutRepo: jest.Mocked<WorkoutRepository>;
  let mockExerciseRepo: jest.Mocked<ExerciseRepository>;
  let workoutService: WorkoutService;

  beforeEach(() => {
    // Create mock repository objects
    mockWorkoutRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addBlock: jest.fn(),
      deleteBlock: jest.fn(),
      findWorkoutIdByBlockId: jest.fn(),
      addExerciseToBlock: jest.fn(),
      deleteExerciseInstance: jest.fn(),
      findWorkoutIdByExerciseId: jest.fn(),
      updateSet: jest.fn(),
    } as any;

    mockExerciseRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      checkDuplicateName: jest.fn(),
    } as any;

    // Create service instance with mocked dependencies
    workoutService = createWorkoutService(mockWorkoutRepo, mockExerciseRepo);
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

      mockWorkoutRepo.create.mockResolvedValue(mockWorkout);

      const result = await workoutService.createWorkout(mockUserId, workoutData);

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

      mockWorkoutRepo.findById.mockResolvedValue(mockWorkout);
      mockExerciseRepo.findById.mockResolvedValue(mockExercise);

      const result = await workoutService.getWorkoutById(mockWorkoutId);

      expect(result.id).toBe(mockWorkoutId);
      expect(result.name).toBe('Push Day');
      expect(mockWorkoutRepo.findById).toHaveBeenCalledWith(mockWorkoutId);
    });

    it('should throw error when workout not found', async () => {
      mockWorkoutRepo.findById.mockResolvedValue(null);

      await expect(workoutService.getWorkoutById(mockWorkoutId)).rejects.toThrow(AppError);
      await expect(workoutService.getWorkoutById(mockWorkoutId)).rejects.toThrow('Workout not found');
    });

    it('should throw error for non-numeric ID', async () => {
      await expect(workoutService.getWorkoutById('invalid-id')).rejects.toThrow(AppError);
      await expect(workoutService.getWorkoutById('invalid-id')).rejects.toThrow('Invalid workout ID');
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

      mockWorkoutRepo.update.mockResolvedValue(mockWorkout);

      const result = await workoutService.updateWorkout(mockWorkoutId, updates);

      expect(result.name).toBe('Updated Push Day');
      expect(result.notes).toBe('Updated notes');
      expect(mockWorkoutRepo.update).toHaveBeenCalled();
    });

    it('should throw error for non-numeric ID', async () => {
      await expect(workoutService.updateWorkout('invalid-id', {})).rejects.toThrow(AppError);
      await expect(workoutService.updateWorkout('invalid-id', {})).rejects.toThrow('Invalid workout ID');
    });

    it('should throw error when workout not found', async () => {
      mockWorkoutRepo.update.mockResolvedValue(null);

      await expect(workoutService.updateWorkout(mockWorkoutId, {})).rejects.toThrow(AppError);
      await expect(workoutService.updateWorkout(mockWorkoutId, {})).rejects.toThrow('Workout not found');
    });
  });

  describe('deleteWorkout', () => {
    it('should delete workout by ID', async () => {
      mockWorkoutRepo.delete.mockResolvedValue(true);

      await workoutService.deleteWorkout(mockWorkoutId);

      expect(mockWorkoutRepo.delete).toHaveBeenCalledWith(mockWorkoutId);
    });

    it('should throw error for non-numeric ID', async () => {
      await expect(workoutService.deleteWorkout('invalid-id')).rejects.toThrow(AppError);
      await expect(workoutService.deleteWorkout('invalid-id')).rejects.toThrow('Invalid workout ID');
    });

    it('should throw error when workout not found', async () => {
      mockWorkoutRepo.delete.mockResolvedValue(false);

      await expect(workoutService.deleteWorkout(mockWorkoutId)).rejects.toThrow(AppError);
      await expect(workoutService.deleteWorkout(mockWorkoutId)).rejects.toThrow('Workout not found');
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

      mockWorkoutRepo.findByUserId.mockResolvedValue(mockWorkouts);

      const result = await workoutService.listWorkouts(mockUserId, {}, { page: 1, limit: 50 });

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

      mockWorkoutRepo.findByUserId.mockResolvedValue(mockWorkouts);

      const result = await workoutService.listWorkouts(
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

      mockWorkoutRepo.findById.mockResolvedValue(mockWorkout);
      mockWorkoutRepo.create.mockResolvedValue(mockDuplicatedWorkout);

      const result = await workoutService.duplicateWorkout(mockWorkoutId, mockUserId, '2025-11-02');

      expect(result.id).toBe('2');
      expect(result.name).toBe('Push Day (Copy)');
      expect(result.date).toBe('2025-11-02');
      expect(mockWorkoutRepo.create).toHaveBeenCalled();
    });

    it('should throw error when workout not found', async () => {
      mockWorkoutRepo.findById.mockResolvedValue(null);

      await expect(workoutService.duplicateWorkout(mockWorkoutId, mockUserId, '2025-11-02')).rejects.toThrow(
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

      mockWorkoutRepo.findByUserId.mockResolvedValue(mockWorkouts);

      const result = await workoutService.getWorkoutsByDateRange(mockUserId, '2025-11-01', '2025-11-30');

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
      mockWorkoutRepo.findById
        .mockResolvedValueOnce(mockWorkout)
        .mockResolvedValueOnce(updatedWorkout);
      mockWorkoutRepo.addBlock.mockResolvedValue({} as any);
      mockWorkoutRepo.update.mockResolvedValue(updatedWorkout);

      const result = await workoutService.addBlock(mockWorkoutId, blockData);

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

      mockWorkoutRepo.findWorkoutIdByBlockId.mockResolvedValue(mockWorkoutId);
      mockWorkoutRepo.deleteBlock.mockResolvedValue(true);
      mockWorkoutRepo.update.mockResolvedValue(mockWorkout);
      mockWorkoutRepo.findById.mockResolvedValue(mockWorkout);

      const result = await workoutService.removeBlock('block-1');

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

      mockWorkoutRepo.findWorkoutIdByBlockId.mockResolvedValue(mockWorkoutId);
      mockWorkoutRepo.addExerciseToBlock.mockResolvedValue({} as any);
      mockWorkoutRepo.update.mockResolvedValue(mockWorkout);
      mockWorkoutRepo.findById.mockResolvedValue(mockWorkout);

      const result = await workoutService.addExercise('block-1', exerciseData);

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

      mockWorkoutRepo.findWorkoutIdByExerciseId.mockResolvedValue(mockWorkoutId);
      mockWorkoutRepo.deleteExerciseInstance.mockResolvedValue(true);
      mockWorkoutRepo.update.mockResolvedValue(mockWorkout);
      mockWorkoutRepo.findById.mockResolvedValue(mockWorkout);

      const result = await workoutService.removeExercise('exercise-1');

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

      mockWorkoutRepo.updateSet.mockResolvedValue({ set: mockSet, workoutId: mockWorkoutId });
      mockWorkoutRepo.update.mockResolvedValue(mockWorkout);
      mockWorkoutRepo.findById.mockResolvedValue(mockWorkout);

      await workoutService.updateSet('set-1', { reps: 12 });

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

      mockWorkoutRepo.updateSet.mockResolvedValue({ set: mockSet, workoutId: mockWorkoutId });
      mockWorkoutRepo.update.mockResolvedValue(mockWorkout);
      mockWorkoutRepo.findById.mockResolvedValue(mockWorkout);

      await workoutService.completeSet('set-1', { reps: 10, weight: 135 });

      expect(mockWorkoutRepo.updateSet).toHaveBeenCalled();
    });
  });
});
