import mongoose from 'mongoose';
import { Workout } from '../../../src/models/Workout';
import {
  createWorkout,
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
  listWorkouts,
  duplicateWorkout,
  getWorkoutsByDateRange,
  startWorkout,
  addBlock,
  removeBlock,
  reorderBlocks,
  addExercise,
  removeExercise,
  reorderExercises,
  updateSet,
  completeSet,
} from '../../../src/services/workout.service';
import { AppError } from '../../../src/middleware/errorHandler';

// Mock the Workout model
jest.mock('../../../src/models/Workout');

const MockedWorkout = Workout as jest.Mocked<typeof Workout>;

describe('Workout Service - Core CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserId = new mongoose.Types.ObjectId();
  const mockWorkoutId = new mongoose.Types.ObjectId();

  describe('createWorkout', () => {
    it('should create a new workout with valid data', async () => {
      const workoutData = {
        name: 'Push Day',
        date: '2025-11-01',
        notes: 'Focus on chest and shoulders',
        blocks: [],
      };

      const mockWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        ...workoutData,
        lastModifiedTime: new Date().toISOString(),
      };

      MockedWorkout.create.mockResolvedValue(mockWorkout as any);

      const result = await createWorkout(mockUserId.toString(), workoutData);

      expect(result.id).toBe(mockWorkoutId.toString());
      expect(result.name).toBe('Push Day');
      expect(result.date).toBe('2025-11-01');
      expect(MockedWorkout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          name: 'Push Day',
          date: '2025-11-01',
          lastModifiedTime: expect.any(String),
        })
      );
    });

    it('should create a workout with blocks and exercises', async () => {
      const workoutData = {
        name: 'Upper Body',
        date: '2025-11-01',
        blocks: [
          {
            id: expect.any(String),
            exercises: [
              {
                id: expect.any(String),
                exerciseId: 'bench-press-id',
                orderInBlock: 0,
                sets: [
                  {
                    id: expect.any(String),
                    setNumber: 1,
                    targetRepsMin: 10,
                    targetRepsMax: 10,
                    targetWeight: 135,
                    weightUnit: 'lbs' as const,
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      };

      const mockWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        ...workoutData,
        lastModifiedTime: new Date().toISOString(),
      };

      MockedWorkout.create.mockResolvedValue(mockWorkout as any);

      const result = await createWorkout(mockUserId.toString(), workoutData);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].exercises).toHaveLength(1);
      expect(result.blocks[0].exercises[0].sets).toHaveLength(1);
    });
  });

  describe('getWorkoutById', () => {
    it('should return workout by valid ID', async () => {
      const mockWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      };

      MockedWorkout.findById.mockResolvedValue(mockWorkout as any);

      const result = await getWorkoutById(mockWorkoutId.toString());

      expect(result.id).toBe(mockWorkoutId.toString());
      expect(result.name).toBe('Push Day');
      expect(MockedWorkout.findById).toHaveBeenCalledWith(mockWorkoutId.toString());
    });

    it('should throw error for invalid ID', async () => {
      await expect(getWorkoutById('invalid-id')).rejects.toThrow(AppError);
      await expect(getWorkoutById('invalid-id')).rejects.toThrow('Invalid workout ID');
    });

    it('should throw error when workout not found', async () => {
      MockedWorkout.findById.mockResolvedValue(null);

      await expect(getWorkoutById(mockWorkoutId.toString())).rejects.toThrow(AppError);
      await expect(getWorkoutById(mockWorkoutId.toString())).rejects.toThrow('Workout not found');
    });
  });

  describe('updateWorkout', () => {
    it('should update workout name and notes', async () => {
      const updates = {
        name: 'Push Day Updated',
        notes: 'Updated notes',
      };

      const mockWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day Updated',
        date: '2025-11-01',
        notes: 'Updated notes',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      };

      MockedWorkout.findByIdAndUpdate.mockResolvedValue(mockWorkout as any);

      const result = await updateWorkout(mockWorkoutId.toString(), updates);

      expect(result.name).toBe('Push Day Updated');
      expect(result.notes).toBe('Updated notes');
      expect(MockedWorkout.findByIdAndUpdate).toHaveBeenCalledWith(
        mockWorkoutId.toString(),
        expect.objectContaining({
          ...updates,
          lastModifiedTime: expect.any(String),
        }),
        { new: true, runValidators: true }
      );
    });

    it('should throw error for invalid ID', async () => {
      await expect(updateWorkout('invalid-id', { name: 'Test' })).rejects.toThrow(AppError);
      await expect(updateWorkout('invalid-id', { name: 'Test' })).rejects.toThrow(
        'Invalid workout ID'
      );
    });

    it('should throw error when workout not found', async () => {
      MockedWorkout.findByIdAndUpdate.mockResolvedValue(null);

      await expect(updateWorkout(mockWorkoutId.toString(), { name: 'Test' })).rejects.toThrow(
        AppError
      );
      await expect(updateWorkout(mockWorkoutId.toString(), { name: 'Test' })).rejects.toThrow(
        'Workout not found'
      );
    });
  });

  describe('deleteWorkout', () => {
    it('should delete workout by valid ID', async () => {
      const mockWorkout = {
        _id: mockWorkoutId,
        name: 'Push Day',
      };

      MockedWorkout.findByIdAndDelete.mockResolvedValue(mockWorkout as any);

      await deleteWorkout(mockWorkoutId.toString());

      expect(MockedWorkout.findByIdAndDelete).toHaveBeenCalledWith(mockWorkoutId.toString());
    });

    it('should throw error for invalid ID', async () => {
      await expect(deleteWorkout('invalid-id')).rejects.toThrow(AppError);
      await expect(deleteWorkout('invalid-id')).rejects.toThrow('Invalid workout ID');
    });

    it('should throw error when workout not found', async () => {
      MockedWorkout.findByIdAndDelete.mockResolvedValue(null);

      await expect(deleteWorkout(mockWorkoutId.toString())).rejects.toThrow(AppError);
      await expect(deleteWorkout(mockWorkoutId.toString())).rejects.toThrow('Workout not found');
    });
  });

  describe('listWorkouts', () => {
    it('should return paginated workouts for a user', async () => {
      const mockWorkouts = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: mockUserId,
          name: 'Push Day',
          date: '2025-11-01',
          lastModifiedTime: new Date().toISOString(),
          blocks: [],
          },
        {
          _id: new mongoose.Types.ObjectId(),
          userId: mockUserId,
          name: 'Pull Day',
          date: '2025-11-02',
          lastModifiedTime: new Date().toISOString(),
          blocks: [],
          },
      ];

      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockWorkouts),
      };

      MockedWorkout.find.mockReturnValue(mockFind as any);
      MockedWorkout.countDocuments.mockResolvedValue(2 as never);

      const result = await listWorkouts(mockUserId.toString(), {}, { page: 1, limit: 50 });

      expect(result.workouts).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.pages).toBe(1);
      expect(MockedWorkout.find).toHaveBeenCalledWith({ userId: mockUserId });
    });

    it('should filter workouts by date range', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      MockedWorkout.find.mockReturnValue(mockFind as any);
      MockedWorkout.countDocuments.mockResolvedValue(0 as never);

      await listWorkouts(
        mockUserId.toString(),
        { dateFrom: '2025-11-01', dateTo: '2025-11-30' },
        { page: 1, limit: 50 }
      );

      expect(MockedWorkout.find).toHaveBeenCalledWith({
        userId: mockUserId,
        date: { $gte: '2025-11-01', $lte: '2025-11-30' },
      });
    });
  });

  describe('duplicateWorkout', () => {
    it('should duplicate workout to a new date', async () => {
      const originalWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: 'block-1',
            exercises: [
              {
                id: 'exercise-1',
                exerciseId: 'bench-press-id',
                orderInBlock: 0,
                sets: [
                  {
                    id: 'set-1',
                    setNumber: 1,
                    targetRepsMin: 10,
                    targetRepsMax: 10,
                    targetWeight: 135,
                    weightUnit: 'lbs' as const,
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      };

      MockedWorkout.findById.mockResolvedValue(originalWorkout as any);

      // Mock create to capture what was passed and return it
      MockedWorkout.create.mockImplementation((data: any) =>
        Promise.resolve({
          ...data,
          _id: new mongoose.Types.ObjectId(),
        } as any)
      );

      const result = await duplicateWorkout(
        mockWorkoutId.toString(),
        mockUserId.toString(),
        '2025-11-08'
      );

      expect(result.date).toBe('2025-11-08');
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).not.toBe('block-1'); // New UUIDs generated
      expect(MockedWorkout.create).toHaveBeenCalled();
    });

    it('should throw error when workout not found', async () => {
      MockedWorkout.findById.mockResolvedValue(null);

      await expect(
        duplicateWorkout(mockWorkoutId.toString(), mockUserId.toString())
      ).rejects.toThrow(AppError);
      await expect(
        duplicateWorkout(mockWorkoutId.toString(), mockUserId.toString())
      ).rejects.toThrow('Workout not found');
    });
  });

  describe('getWorkoutsByDateRange', () => {
    it('should return workouts within date range', async () => {
      const mockWorkouts = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: mockUserId,
          name: 'Push Day',
          date: '2025-11-01',
          lastModifiedTime: new Date().toISOString(),
          blocks: [],
          },
      ];

      const mockFind = {
        sort: jest.fn().mockResolvedValue(mockWorkouts),
      };

      MockedWorkout.find.mockReturnValue(mockFind as any);

      const result = await getWorkoutsByDateRange(
        mockUserId.toString(),
        '2025-11-01',
        '2025-11-07'
      );

      expect(result).toHaveLength(1);
      expect(MockedWorkout.find).toHaveBeenCalledWith({
        userId: mockUserId,
        date: { $gte: '2025-11-01', $lte: '2025-11-07' },
      });
    });
  });

  describe('startWorkout', () => {
    it('should set startTime on workout', async () => {
      const mockWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        startTime: new Date().toISOString(),
        blocks: [],
      };

      MockedWorkout.findByIdAndUpdate.mockResolvedValue(mockWorkout as any);

      const result = await startWorkout(mockWorkoutId.toString());

      expect(result.startTime).toBeDefined();
      expect(MockedWorkout.findByIdAndUpdate).toHaveBeenCalledWith(
        mockWorkoutId.toString(),
        expect.objectContaining({
          startTime: expect.any(String),
          lastModifiedTime: expect.any(String),
        }),
        { new: true, runValidators: true }
      );
    });

    it('should throw error when workout not found', async () => {
      MockedWorkout.findByIdAndUpdate.mockResolvedValue(null);

      await expect(startWorkout(mockWorkoutId.toString())).rejects.toThrow(AppError);
      await expect(startWorkout(mockWorkoutId.toString())).rejects.toThrow('Workout not found');
    });
  });
});

describe('Workout Service - Block Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockWorkoutId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();

  describe('addBlock', () => {
    it('should add a new block to a workout', async () => {
      const blockData = {
        exercises: [],
        notes: 'Warm-up block',
      };

      const mockWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [],
      };

      const updatedWorkout = {
        ...mockWorkout,
        blocks: [
          {
            id: 'new-uuid',
            exercises: [],
            notes: 'Warm-up block',
          },
        ],
      };

      MockedWorkout.findById.mockResolvedValue(mockWorkout as any);
      MockedWorkout.findByIdAndUpdate.mockResolvedValue(updatedWorkout as any);

      const result = await addBlock(mockWorkoutId.toString(), blockData);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].notes).toBe('Warm-up block');
      expect(MockedWorkout.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('removeBlock', () => {
    it('should remove a block from a workout', async () => {
      const blockId = 'block-123';

      const mockWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          { id: blockId, exercises: [], notes: 'Block to remove' },
          { id: 'block-456', exercises: [], notes: 'Keep this block' },
        ],
      };

      MockedWorkout.findOne.mockResolvedValue(mockWorkout as any);
      MockedWorkout.findByIdAndUpdate.mockResolvedValue({
        ...mockWorkout,
        blocks: [{ id: 'block-456', exercises: [], notes: 'Keep this block' }],
      } as any);

      const result = await removeBlock(blockId);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).toBe('block-456');
    });

    it('should throw error when block not found', async () => {
      MockedWorkout.findOne.mockResolvedValue(null);

      await expect(removeBlock('nonexistent-block')).rejects.toThrow(AppError);
      await expect(removeBlock('nonexistent-block')).rejects.toThrow('Block not found');
    });
  });

  describe('reorderBlocks', () => {
    it('should reorder blocks within a workout', async () => {
      const blockOrders = [
        { blockId: 'block-2', order: 0 },
        { blockId: 'block-1', order: 1 },
      ];

      const mockWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          { id: 'block-1', exercises: [], notes: 'First' },
          { id: 'block-2', exercises: [], notes: 'Second' },
        ],
      };

      MockedWorkout.findById.mockResolvedValue(mockWorkout as any);
      MockedWorkout.findByIdAndUpdate.mockResolvedValue({
        ...mockWorkout,
        blocks: [
          { id: 'block-2', exercises: [], notes: 'Second' },
          { id: 'block-1', exercises: [], notes: 'First' },
        ],
      } as any);

      const result = await reorderBlocks(mockWorkoutId.toString(), blockOrders);

      expect(result.blocks[0].id).toBe('block-2');
      expect(result.blocks[1].id).toBe('block-1');
    });
  });
});

describe('Workout Service - Exercise Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockWorkoutId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();

  describe('addExercise', () => {
    it('should add an exercise to a block', async () => {
      const blockId = 'block-123';
      const exerciseData = {
        exerciseId: 'bench-press-id',
        orderInBlock: 0,
        sets: [
          {
            setNumber: 1,
            targetRepsMin: 10,
            targetRepsMax: 10,
            targetWeight: 135,
            weightUnit: 'lbs' as const,
            completed: false,
          },
        ],
      };

      const mockWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [{ id: blockId, exercises: [], notes: 'Main block' }],
        save: jest.fn().mockResolvedValue({
          _id: mockWorkoutId,
          userId: mockUserId,
          name: 'Push Day',
          date: '2025-11-01',
          lastModifiedTime: new Date().toISOString(),
          blocks: [
            {
              id: blockId,
              exercises: [
                {
                  id: 'new-exercise-uuid',
                  ...exerciseData,
                  sets: [
                    {
                      id: 'new-set-uuid',
                      ...exerciseData.sets[0],
                    },
                  ],
                },
              ],
              notes: 'Main block',
            },
          ],
          }),
      };

      MockedWorkout.findOne.mockResolvedValue(mockWorkout as any);

      const result = await addExercise(blockId, exerciseData);

      expect(result.blocks[0].exercises).toHaveLength(1);
      expect(result.blocks[0].exercises[0].exerciseId).toBe('bench-press-id');
    });

    it('should throw error when block not found', async () => {
      MockedWorkout.findOne.mockResolvedValue(null);

      await expect(
        addExercise('nonexistent-block', {
          exerciseId: 'test',
          orderInBlock: 0,
          sets: [],
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('removeExercise', () => {
    it('should remove an exercise from a block', async () => {
      const exerciseId = 'exercise-123';
      const blockId = 'block-123';

      const mockWorkout = {
        _id: new mongoose.Types.ObjectId(),
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: blockId,
            exercises: [
              { id: exerciseId, exerciseId: 'bench-press', orderInBlock: 0, sets: [] },
              { id: 'exercise-456', exerciseId: 'squat', orderInBlock: 1, sets: [] },
            ],
          },
        ],
        save: jest.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          userId: mockUserId,
          name: 'Push Day',
          date: '2025-11-01',
          lastModifiedTime: new Date().toISOString(),
          blocks: [
            {
              id: blockId,
              exercises: [
                { id: 'exercise-456', exerciseId: 'squat', orderInBlock: 1, sets: [] },
              ],
            },
          ],
          }),
      };

      MockedWorkout.findOne.mockResolvedValue(mockWorkout as any);

      const result = await removeExercise(exerciseId);

      expect(result.blocks[0].exercises).toHaveLength(1);
      expect(result.blocks[0].exercises[0].id).toBe('exercise-456');
    });
  });

  describe('reorderExercises', () => {
    it('should reorder exercises within a block', async () => {
      const blockId = 'block-123';
      const exerciseOrders = [
        { exerciseId: 'exercise-2', orderInBlock: 0 },
        { exerciseId: 'exercise-1', orderInBlock: 1 },
      ];

      const mockWorkout = {
        _id: new mongoose.Types.ObjectId(),
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: blockId,
            exercises: [
              { id: 'exercise-1', exerciseId: 'bench-press', orderInBlock: 0, sets: [] },
              { id: 'exercise-2', exerciseId: 'squat', orderInBlock: 1, sets: [] },
            ],
          },
        ],
        save: jest.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          userId: mockUserId,
          name: 'Push Day',
          date: '2025-11-01',
          lastModifiedTime: new Date().toISOString(),
          blocks: [
            {
              id: blockId,
              exercises: [
                { id: 'exercise-2', exerciseId: 'squat', orderInBlock: 0, sets: [] },
                { id: 'exercise-1', exerciseId: 'bench-press', orderInBlock: 1, sets: [] },
              ],
            },
          ],
          }),
      };

      MockedWorkout.findOne.mockResolvedValue(mockWorkout as any);

      const result = await reorderExercises(blockId, exerciseOrders);

      expect(result.blocks[0].exercises[0].id).toBe('exercise-2');
      expect(result.blocks[0].exercises[1].id).toBe('exercise-1');
    });
  });
});

describe('Workout Service - Set Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockWorkoutId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();

  describe('updateSet', () => {
    it('should update a set with new data', async () => {
      const setId = 'set-123';
      const setData = {
        actualReps: 10,
        actualWeight: 135,
        rpe: 8,
        notes: 'Felt strong',
      };

      const mockWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: 'block-123',
            exercises: [
              {
                id: 'exercise-123',
                exerciseId: 'bench-press',
                orderInBlock: 0,
                sets: [
                  {
                    id: setId,
                    setNumber: 1,
                    targetRepsMin: 10,
                    targetRepsMax: 10,
                    targetWeight: 135,
                    weightUnit: 'lbs' as const,
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
        save: jest.fn().mockResolvedValue({
          _id: mockWorkoutId,
          userId: mockUserId,
          name: 'Push Day',
          date: '2025-11-01',
          lastModifiedTime: new Date().toISOString(),
          blocks: [
            {
              id: 'block-123',
              exercises: [
                {
                  id: 'exercise-123',
                  exerciseId: 'bench-press',
                  orderInBlock: 0,
                  sets: [
                    {
                      id: setId,
                      setNumber: 1,
                      targetRepsMin: 10,
                    targetRepsMax: 10,
                      targetWeight: 135,
                      ...setData,
                      weightUnit: 'lbs' as const,
                      completed: false,
                    },
                  ],
                },
              ],
            },
          ],
          }),
      };

      MockedWorkout.findOne.mockResolvedValue(mockWorkout as any);

      const result = await updateSet(setId, setData);

      const updatedSet = result.blocks[0].exercises[0].sets[0];
      expect(updatedSet.actualReps).toBe(10);
      expect(updatedSet.actualWeight).toBe(135);
      expect(updatedSet.rpe).toBe(8);
    });

    it('should throw error when set not found', async () => {
      MockedWorkout.findOne.mockResolvedValue(null);

      await expect(updateSet('nonexistent-set', {})).rejects.toThrow(AppError);
      await expect(updateSet('nonexistent-set', {})).rejects.toThrow('Set not found');
    });
  });

  describe('completeSet', () => {
    it('should mark a set as completed with data', async () => {
      const setId = 'set-123';
      const completionData = {
        actualReps: 10,
        actualWeight: 135,
        rpe: 8,
      };

      const mockWorkout = {
        _id: mockWorkoutId,
        userId: mockUserId,
        name: 'Push Day',
        date: '2025-11-01',
        lastModifiedTime: new Date().toISOString(),
        blocks: [
          {
            id: 'block-123',
            exercises: [
              {
                id: 'exercise-123',
                exerciseId: 'bench-press',
                orderInBlock: 0,
                sets: [
                  {
                    id: setId,
                    setNumber: 1,
                    targetRepsMin: 10,
                    targetRepsMax: 10,
                    targetWeight: 135,
                    weightUnit: 'lbs' as const,
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
        save: jest.fn().mockResolvedValue({
          _id: mockWorkoutId,
          userId: mockUserId,
          name: 'Push Day',
          date: '2025-11-01',
          lastModifiedTime: new Date().toISOString(),
          blocks: [
            {
              id: 'block-123',
              exercises: [
                {
                  id: 'exercise-123',
                  exerciseId: 'bench-press',
                  orderInBlock: 0,
                  sets: [
                    {
                      id: setId,
                      setNumber: 1,
                      targetRepsMin: 10,
                    targetRepsMax: 10,
                      targetWeight: 135,
                      ...completionData,
                      weightUnit: 'lbs' as const,
                      completed: true,
                      completedAt: new Date().toISOString(),
                    },
                  ],
                },
              ],
            },
          ],
          }),
      };

      MockedWorkout.findOne.mockResolvedValue(mockWorkout as any);

      const result = await completeSet(setId, completionData);

      const completedSet = result.blocks[0].exercises[0].sets[0];
      expect(completedSet.actualReps).toBe(10);
    });
  });
});
