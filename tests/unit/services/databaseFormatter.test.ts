import { DatabaseFormatter } from '../../../src/services/workoutParser/databaseFormatter';
import { WorkoutWithResolvedExercises } from '../../../src/services/workoutParser/types';

// Mock crypto.randomUUID
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substring(7)),
}));

describe('DatabaseFormatter', () => {
  let formatter: DatabaseFormatter;

  beforeEach(() => {
    formatter = new DatabaseFormatter();
  });

  describe('format', () => {
    it('should add workout ID', () => {
      const resolvedWorkout: WorkoutWithResolvedExercises = {
        name: 'Test Workout',
        date: '2025-11-01',
        startTime: undefined,
        lastModifiedTime: '2025-11-01T12:00:00Z',
        notes: undefined,
        blocks: [],
      };

      const result = formatter.format(resolvedWorkout);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('should add block IDs', () => {
      const resolvedWorkout: WorkoutWithResolvedExercises = {
        name: 'Test Workout',
        date: '2025-11-01',
        startTime: undefined,
        lastModifiedTime: '2025-11-01T12:00:00Z',
        notes: undefined,
        blocks: [
          {
            label: 'Block 1',
            exercises: [],
            restPeriod: undefined,
            notes: undefined,
          },
          {
            label: 'Block 2',
            exercises: [],
            restPeriod: undefined,
            notes: undefined,
          },
        ],
      };

      const result = formatter.format(resolvedWorkout);

      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].id).toBeDefined();
      expect(result.blocks[1].id).toBeDefined();
      expect(result.blocks[0].id).not.toBe(result.blocks[1].id);
    });

    it('should add exercise IDs', () => {
      const resolvedWorkout: WorkoutWithResolvedExercises = {
        name: 'Test Workout',
        date: '2025-11-01',
        startTime: undefined,
        lastModifiedTime: '2025-11-01T12:00:00Z',
        notes: undefined,
        blocks: [
          {
            label: 'Block 1',
            exercises: [
              {
                exerciseId: 'exercise-123',
                orderInBlock: 0,
                sets: [],
                restPeriod: undefined,
                notes: undefined,
              },
              {
                exerciseId: 'exercise-456',
                orderInBlock: 1,
                sets: [],
                restPeriod: undefined,
                notes: undefined,
              },
            ],
            restPeriod: undefined,
            notes: undefined,
          },
        ],
      };

      const result = formatter.format(resolvedWorkout);

      expect(result.blocks[0].exercises).toHaveLength(2);
      expect(result.blocks[0].exercises[0].id).toBeDefined();
      expect(result.blocks[0].exercises[1].id).toBeDefined();
      expect(result.blocks[0].exercises[0].id).not.toBe(
        result.blocks[0].exercises[1].id
      );
    });

    it('should add set IDs', () => {
      const resolvedWorkout: WorkoutWithResolvedExercises = {
        name: 'Test Workout',
        date: '2025-11-01',
        startTime: undefined,
        lastModifiedTime: '2025-11-01T12:00:00Z',
        notes: undefined,
        blocks: [
          {
            label: 'Block 1',
            exercises: [
              {
                exerciseId: 'exercise-123',
                orderInBlock: 0,
                sets: [
                  {
                    setNumber: 1,
                    targetRepsMin: 8,
                    targetRepsMax: 10,
                    actualReps: undefined,
                    targetWeight: undefined,
                    actualWeight: undefined,
                    weightUnit: 'lbs',
                    duration: undefined,
                    rpe: undefined,
                    completed: false,
                    completedAt: undefined,
                    notes: undefined,
                  },
                  {
                    setNumber: 2,
                    targetRepsMin: 8,
                    targetRepsMax: 10,
                    actualReps: undefined,
                    targetWeight: undefined,
                    actualWeight: undefined,
                    weightUnit: 'lbs',
                    duration: undefined,
                    rpe: undefined,
                    completed: false,
                    completedAt: undefined,
                    notes: undefined,
                  },
                ],
                restPeriod: undefined,
                notes: undefined,
              },
            ],
            restPeriod: undefined,
            notes: undefined,
          },
        ],
      };

      const result = formatter.format(resolvedWorkout);

      const sets = result.blocks[0].exercises[0].sets;
      expect(sets).toHaveLength(2);
      expect(sets[0].id).toBeDefined();
      expect(sets[1].id).toBeDefined();
      expect(sets[0].id).not.toBe(sets[1].id);
    });

    it('should preserve all workout data', () => {
      const resolvedWorkout: WorkoutWithResolvedExercises = {
        name: 'Lower Body Strength',
        date: '2025-11-01',
        startTime: undefined,
        lastModifiedTime: '2025-11-01T12:00:00Z',
        notes: 'Great workout!',
        blocks: [
          {
            label: 'Warm Up',
            exercises: [
              {
                exerciseId: 'exercise-123',
                orderInBlock: 0,
                sets: [
                  {
                    setNumber: 1,
                    targetRepsMin: 15,
                    targetRepsMax: 15,
                    actualReps: undefined,
                    targetWeight: undefined,
                    actualWeight: undefined,
                    weightUnit: 'lbs',
                    duration: undefined,
                    rpe: undefined,
                    completed: false,
                    completedAt: undefined,
                    notes: undefined,
                  },
                ],
                restPeriod: '60 sec',
                notes: 'Focus on form',
              },
            ],
            restPeriod: '2-3 min',
            notes: 'Take your time',
          },
        ],
      };

      const result = formatter.format(resolvedWorkout);

      // Verify workout-level data
      expect(result.name).toBe('Lower Body Strength');
      expect(result.date).toBe('2025-11-01');
      expect(result.notes).toBe('Great workout!');

      // Verify block-level data
      expect(result.blocks[0].label).toBe('Warm Up');
      expect(result.blocks[0].restPeriod).toBe('2-3 min');
      expect(result.blocks[0].notes).toBe('Take your time');

      // Verify exercise-level data
      const exercise = result.blocks[0].exercises[0];
      expect(exercise.exerciseId).toBe('exercise-123');
      expect(exercise.orderInBlock).toBe(0);
      expect(exercise.restPeriod).toBe('60 sec');
      expect(exercise.notes).toBe('Focus on form');

      // Verify set-level data
      const set = exercise.sets[0];
      expect(set.setNumber).toBe(1);
      expect(set.targetRepsMin).toBe(15);
      expect(set.targetRepsMax).toBe(15);
      expect(set.weightUnit).toBe('lbs');
      expect(set.completed).toBe(false);
    });

    it('should generate unique IDs across multiple blocks, exercises, and sets', () => {
      const resolvedWorkout: WorkoutWithResolvedExercises = {
        name: 'Test Workout',
        date: '2025-11-01',
        startTime: undefined,
        lastModifiedTime: '2025-11-01T12:00:00Z',
        notes: undefined,
        blocks: [
          {
            label: 'Block 1',
            exercises: [
              {
                exerciseId: 'ex1',
                orderInBlock: 0,
                sets: [
                  {
                    setNumber: 1,
                    targetRepsMin: 10,
                    targetRepsMax: 10,
                    actualReps: undefined,
                    targetWeight: undefined,
                    actualWeight: undefined,
                    weightUnit: 'lbs',
                    duration: undefined,
                    rpe: undefined,
                    completed: false,
                    completedAt: undefined,
                    notes: undefined,
                  },
                  {
                    setNumber: 2,
                    targetRepsMin: 10,
                    targetRepsMax: 10,
                    actualReps: undefined,
                    targetWeight: undefined,
                    actualWeight: undefined,
                    weightUnit: 'lbs',
                    duration: undefined,
                    rpe: undefined,
                    completed: false,
                    completedAt: undefined,
                    notes: undefined,
                  },
                ],
                restPeriod: undefined,
                notes: undefined,
              },
              {
                exerciseId: 'ex2',
                orderInBlock: 1,
                sets: [
                  {
                    setNumber: 1,
                    targetRepsMin: 5,
                    targetRepsMax: 5,
                    actualReps: undefined,
                    targetWeight: undefined,
                    actualWeight: undefined,
                    weightUnit: 'lbs',
                    duration: undefined,
                    rpe: undefined,
                    completed: false,
                    completedAt: undefined,
                    notes: undefined,
                  },
                ],
                restPeriod: undefined,
                notes: undefined,
              },
            ],
            restPeriod: undefined,
            notes: undefined,
          },
          {
            label: 'Block 2',
            exercises: [
              {
                exerciseId: 'ex3',
                orderInBlock: 0,
                sets: [
                  {
                    setNumber: 1,
                    targetRepsMin: 8,
                    targetRepsMax: 8,
                    actualReps: undefined,
                    targetWeight: undefined,
                    actualWeight: undefined,
                    weightUnit: 'lbs',
                    duration: undefined,
                    rpe: undefined,
                    completed: false,
                    completedAt: undefined,
                    notes: undefined,
                  },
                ],
                restPeriod: undefined,
                notes: undefined,
              },
            ],
            restPeriod: undefined,
            notes: undefined,
          },
        ],
      };

      const result = formatter.format(resolvedWorkout);

      // Collect all IDs
      const allIds = [
        result.id,
        result.blocks[0].id,
        result.blocks[0].exercises[0].id,
        result.blocks[0].exercises[0].sets[0].id,
        result.blocks[0].exercises[0].sets[1].id,
        result.blocks[0].exercises[1].id,
        result.blocks[0].exercises[1].sets[0].id,
        result.blocks[1].id,
        result.blocks[1].exercises[0].id,
        result.blocks[1].exercises[0].sets[0].id,
      ];

      // Verify all IDs are unique
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it('should handle empty blocks array', () => {
      const resolvedWorkout: WorkoutWithResolvedExercises = {
        name: 'Empty Workout',
        date: '2025-11-01',
        startTime: undefined,
        lastModifiedTime: '2025-11-01T12:00:00Z',
        notes: undefined,
        blocks: [],
      };

      const result = formatter.format(resolvedWorkout);

      expect(result.id).toBeDefined();
      expect(result.blocks).toEqual([]);
    });
  });
});
