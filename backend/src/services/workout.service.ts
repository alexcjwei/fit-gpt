import type { WorkoutRepository } from '../repositories/WorkoutRepository';
import type { ExerciseRepository } from '../repositories/ExerciseRepository';

import { AppError } from '../middleware/errorHandler';
import {
  Workout as WorkoutType,
  WorkoutBlock,
  ExerciseInstance,
  SetInstance,
  WorkoutResponse,
  WorkoutBlockResponse,
  ExerciseInstanceResponse,
} from '../types';
import { randomUUID } from 'crypto';

export interface WorkoutFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Type for creating a new exercise (without generated IDs)
export type ExerciseInstanceInput = Omit<ExerciseInstance, 'id' | 'sets'> & {
  sets: Array<Omit<SetInstance, 'id'>>;
};

export interface PaginatedWorkoutResponse {
  workouts: WorkoutType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Generate new UUIDs for blocks, exercises, and sets
 */
const regenerateIds = (blocks: WorkoutBlock[]): WorkoutBlock[] => {
  return blocks.map((block) => ({
    ...block,
    id: randomUUID(),
    exercises: block.exercises.map((exercise) => ({
      ...exercise,
      id: randomUUID(),
      sets: exercise.sets.map((set) => ({
        ...set,
        id: randomUUID(),
      })),
    })),
  }));
};

/**
 * Create Workout Service with injected dependencies
 * Factory function pattern for dependency injection
 */
export function createWorkoutService(
  workoutRepository: WorkoutRepository,
  exerciseRepository: ExerciseRepository
) {
  /**
   * Resolve exercise names from exercise IDs in a workout
   * Returns a WorkoutResponse with exercise names populated
   */
  const resolveExerciseNames = async (workout: WorkoutType): Promise<WorkoutResponse> => {
    // Collect all unique exercise IDs from the workout
    const exerciseIds = new Set<string>();
    for (const block of workout.blocks) {
      for (const exercise of block.exercises) {
        exerciseIds.add(exercise.exerciseId);
      }
    }

    // Fetch all exercises by IDs
    const exercises = await Promise.all(
      Array.from(exerciseIds).map((id) => exerciseRepository.findById(id))
    );

    // Create a map of exerciseId to exercise name
    const exerciseNameMap = new Map<string, string>();
    for (const exercise of exercises) {
      if (exercise) {
        exerciseNameMap.set(exercise.id, exercise.name);
      }
    }

    // Transform blocks and exercises to include exercise names
    const blocksWithNames: WorkoutBlockResponse[] = workout.blocks.map((block) => {
      const exercisesWithNames: ExerciseInstanceResponse[] = block.exercises.map((exercise) => {
        return {
          ...exercise,
          exerciseName: exerciseNameMap.get(exercise.exerciseId) ?? 'Unknown Exercise',
        };
      });

      return {
        ...block,
        exercises: exercisesWithNames,
      };
    });

    return {
      ...workout,
      blocks: blocksWithNames,
    };
  };

  return {
    /**
     * Create a new workout
     */
    async createWorkout(
      userId: string,
      workoutData: Omit<WorkoutType, 'id' | 'lastModifiedTime'>
    ): Promise<WorkoutType> {
      // Verify ID is numeric
      if (!/^\d+$/.test(userId)) {
        throw new AppError('Invalid user ID', 400);
      }

      const now = new Date().toISOString();

      const workout = await workoutRepository.create({
        userId,
        name: workoutData.name,
        date: workoutData.date,
        notes: workoutData.notes,
        lastModifiedTime: now,
        blocks: workoutData.blocks || [],
      });

      return workout;
    },

    /**
     * Get a single workout by ID
     * Returns workout with resolved exercise names for frontend display
     */
    async getWorkoutById(workoutId: string, userId: string): Promise<WorkoutResponse> {
      // Verify ID is numeric
      if (!/^\d+$/.test(workoutId)) {
        throw new AppError('Invalid workout ID', 400);
      }

      const workout = await workoutRepository.findById(workoutId);

      if (!workout) {
        throw new AppError('Workout not found', 404);
      }

      // Verify ownership
      const isOwner = await workoutRepository.verifyOwnership(workoutId, userId);
      if (!isOwner) {
        throw new AppError('Access denied', 403);
      }

      return await resolveExerciseNames(workout);
    },

    /**
     * Update an existing workout
     * Note: blocks are managed separately through addBlock, removeBlock, etc.
     */
    async updateWorkout(
      workoutId: string,
      userId: string,
      updates: Partial<Omit<WorkoutType, 'id' | 'lastModifiedTime' | 'blocks'>>
    ): Promise<WorkoutType> {
      // Verify ID is numeric
      if (!/^\d+$/.test(workoutId)) {
        throw new AppError('Invalid workout ID', 400);
      }

      // Verify workout exists
      const existingWorkout = await workoutRepository.findById(workoutId);
      if (!existingWorkout) {
        throw new AppError('Workout not found', 404);
      }

      // Verify ownership
      const isOwner = await workoutRepository.verifyOwnership(workoutId, userId);
      if (!isOwner) {
        throw new AppError('Access denied', 403);
      }

      const now = new Date().toISOString();

      const workout = await workoutRepository.update(workoutId, {
        name: updates.name,
        date: updates.date,
        notes: updates.notes,
        lastModifiedTime: now,
      });

      if (!workout) {
        throw new AppError('Workout not found', 404);
      }

      return workout;
    },

    /**
     * Delete a workout
     */
    async deleteWorkout(workoutId: string, userId: string): Promise<void> {
      // Verify ID is numeric
      if (!/^\d+$/.test(workoutId)) {
        throw new AppError('Invalid workout ID', 400);
      }

      // Verify workout exists
      const existingWorkout = await workoutRepository.findById(workoutId);
      if (!existingWorkout) {
        throw new AppError('Workout not found', 404);
      }

      // Verify ownership
      const isOwner = await workoutRepository.verifyOwnership(workoutId, userId);
      if (!isOwner) {
        throw new AppError('Access denied', 403);
      }

      const deleted = await workoutRepository.delete(workoutId);

      if (!deleted) {
        throw new AppError('Workout not found', 404);
      }
    },

    /**
     * List workouts with optional filtering and pagination
     */
    async listWorkouts(
      userId: string,
      filters: WorkoutFilters = {},
      pagination: PaginationOptions = { page: 1, limit: 50 }
    ): Promise<PaginatedWorkoutResponse> {
      // Verify ID is numeric
      if (!/^\d+$/.test(userId)) {
        throw new AppError('Invalid user ID', 400);
      }

      // Get all workouts for the user
      const allWorkouts = await workoutRepository.findByUserId(userId);

      // Apply date filters if provided
      let filteredWorkouts = allWorkouts;
      if (filters.dateFrom || filters.dateTo) {
        filteredWorkouts = allWorkouts.filter((workout) => {
          if (filters.dateFrom && workout.date < filters.dateFrom) {
            return false;
          }
          if (filters.dateTo && workout.date > filters.dateTo) {
            return false;
          }
          return true;
        });
      }

      // Apply pagination
      const start = (pagination.page - 1) * pagination.limit;
      const end = start + pagination.limit;
      const workouts = filteredWorkouts.slice(start, end);
      const total = filteredWorkouts.length;

      return {
        workouts,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      };
    },

    /**
     * Duplicate a workout to a new date
     */
    async duplicateWorkout(
      workoutId: string,
      userId: string,
      newDate?: string
    ): Promise<WorkoutType> {
      // Verify IDs are numeric
      if (!/^\d+$/.test(workoutId)) {
        throw new AppError('Invalid workout ID', 400);
      }

      if (!/^\d+$/.test(userId)) {
        throw new AppError('Invalid user ID', 400);
      }

      const originalWorkout = await workoutRepository.findById(workoutId);

      if (!originalWorkout) {
        throw new AppError('Workout not found', 404);
      }

      // Verify ownership of the original workout before duplicating
      const isOwner = await workoutRepository.verifyOwnership(workoutId, userId);
      if (!isOwner) {
        throw new AppError('Access denied', 403);
      }

      const now = new Date().toISOString();
      const targetDate = newDate ?? originalWorkout.date;

      // Regenerate UUIDs for all nested items
      const newBlocks = regenerateIds(originalWorkout.blocks);

      const duplicatedWorkout = await workoutRepository.create({
        userId,
        name: originalWorkout.name,
        date: targetDate,
        notes: originalWorkout.notes,
        blocks: newBlocks,
        lastModifiedTime: now,
      });

      return duplicatedWorkout;
    },

    /**
     * Get workouts by date range
     */
    async getWorkoutsByDateRange(
      userId: string,
      startDate: string,
      endDate: string
    ): Promise<WorkoutType[]> {
      // Verify ID is numeric
      if (!/^\d+$/.test(userId)) {
        throw new AppError('Invalid user ID', 400);
      }

      // Get all workouts for the user
      const allWorkouts = await workoutRepository.findByUserId(userId);

      // Filter by date range
      const workouts = allWorkouts.filter((workout) => {
        return workout.date >= startDate && workout.date <= endDate;
      });

      return workouts;
    },

    // ============================================
    // Block Operations
    // ============================================

    /**
     * Add a new block to a workout
     */
    async addBlock(workoutId: string, blockData: Omit<WorkoutBlock, 'id'>): Promise<WorkoutType> {
      // Verify ID is numeric
      if (!/^\d+$/.test(workoutId)) {
        throw new AppError('Invalid workout ID', 400);
      }

      // Verify workout exists
      const workout = await workoutRepository.findById(workoutId);
      if (!workout) {
        throw new AppError('Workout not found', 404);
      }

      // Add block to workout (repository handles UUID generation)
      await workoutRepository.addBlock(workoutId, {
        label: blockData.label,
        notes: blockData.notes,
        exercises: blockData.exercises || [],
      });

      const now = new Date().toISOString();

      // Update workout's lastModifiedTime
      await workoutRepository.update(workoutId, {
        lastModifiedTime: now,
      });

      // Return updated workout
      const updatedWorkout = await workoutRepository.findById(workoutId);

      if (!updatedWorkout) {
        throw new AppError('Workout not found after adding block', 500);
      }

      return updatedWorkout;
    },

    /**
     * Remove a block from a workout
     */
    async removeBlock(blockId: string): Promise<WorkoutType> {
      // Find workout ID containing this block
      const workoutId = await workoutRepository.findWorkoutIdByBlockId(blockId);

      if (!workoutId) {
        throw new AppError('Block not found', 404);
      }

      // Delete the block (CASCADE will delete nested exercises and sets)
      const deleted = await workoutRepository.deleteBlock(blockId);

      if (!deleted) {
        throw new AppError('Block not found', 404);
      }

      const now = new Date().toISOString();

      // Update workout's lastModifiedTime
      await workoutRepository.update(workoutId, {
        lastModifiedTime: now,
      });

      // Return updated workout
      const updatedWorkout = await workoutRepository.findById(workoutId);

      if (!updatedWorkout) {
        throw new AppError('Workout not found after block removal', 500);
      }

      return updatedWorkout;
    },

    /**
     * Reorder blocks within a workout
     * TODO: Implement batch update of order_in_workout for multiple blocks
     */
    async reorderBlocks(
      workoutId: string,
      _blockOrders: Array<{ blockId: string; order: number }>
    ): Promise<WorkoutType> {
      // Verify ID is numeric
      if (!/^\d+$/.test(workoutId)) {
        throw new AppError('Invalid workout ID', 400);
      }

      const workout = await workoutRepository.findById(workoutId);

      if (!workout) {
        throw new AppError('Workout not found', 404);
      }

      // TODO: Implement efficient batch update of order_in_workout
      // For now, this function returns the workout without reordering
      throw new AppError('Reorder blocks not yet implemented', 501);
    },

    // ============================================
    // Exercise Operations
    // ============================================

    /**
     * Add an exercise to a block
     */
    async addExercise(
      blockId: string,
      exerciseData: ExerciseInstanceInput
    ): Promise<WorkoutType> {
      // Find workout ID containing this block
      const workoutId = await workoutRepository.findWorkoutIdByBlockId(blockId);

      if (!workoutId) {
        throw new AppError('Block not found', 404);
      }

      // Add exercise to block (repository handles UUID generation)
      await workoutRepository.addExerciseToBlock(blockId, {
        exerciseId: exerciseData.exerciseId,
        orderInBlock: exerciseData.orderInBlock,
        prescription: exerciseData.prescription,
        notes: exerciseData.notes,
        sets: exerciseData.sets || [],
      });

      const now = new Date().toISOString();

      // Update workout's lastModifiedTime
      await workoutRepository.update(workoutId, {
        lastModifiedTime: now,
      });

      // Return updated workout
      const updatedWorkout = await workoutRepository.findById(workoutId);

      if (!updatedWorkout) {
        throw new AppError('Workout not found after adding exercise', 500);
      }

      return updatedWorkout;
    },

    /**
     * Remove an exercise from a block
     */
    async removeExercise(exerciseId: string): Promise<WorkoutType> {
      // Find workout ID containing this exercise
      const workoutId = await workoutRepository.findWorkoutIdByExerciseId(exerciseId);

      if (!workoutId) {
        throw new AppError('Exercise not found', 404);
      }

      // Delete the exercise (CASCADE will delete nested sets)
      const deleted = await workoutRepository.deleteExerciseInstance(exerciseId);

      if (!deleted) {
        throw new AppError('Exercise not found', 404);
      }

      const now = new Date().toISOString();

      // Update workout's lastModifiedTime
      await workoutRepository.update(workoutId, {
        lastModifiedTime: now,
      });

      // Return updated workout
      const updatedWorkout = await workoutRepository.findById(workoutId);

      if (!updatedWorkout) {
        throw new AppError('Workout not found after exercise removal', 500);
      }

      return updatedWorkout;
    },

    /**
     * Reorder exercises within a block
     * TODO: Implement batch update of order_in_block for multiple exercises
     */
    async reorderExercises(
      blockId: string,
      _exerciseOrders: Array<{ exerciseId: string; orderInBlock: number }>
    ): Promise<WorkoutType> {
      // Find workout ID containing this block
      const workoutId = await workoutRepository.findWorkoutIdByBlockId(blockId);

      if (!workoutId) {
        throw new AppError('Block not found', 404);
      }

      // TODO: Implement efficient batch update of order_in_block
      // For now, this function throws not implemented
      throw new AppError('Reorder exercises not yet implemented', 501);
    },

    // ============================================
    // Set Operations
    // ============================================

    /**
     * Update a set
     */
    async updateSet(
      setId: string,
      setData: Partial<import('../types').SetInstance>
    ): Promise<WorkoutType> {
      // Update the set (this also returns the workout ID)
      const updates = {
        reps: setData.reps,
        weight: setData.weight,
        weightUnit: setData.weightUnit,
        duration: setData.duration,
        rpe: setData.rpe,
        notes: setData.notes,
      };

      const result = await workoutRepository.updateSet(setId, updates);

      if (!result) {
        throw new AppError('Set not found', 404);
      }

      const now = new Date().toISOString();

      // Update workout's lastModifiedTime
      await workoutRepository.update(result.workoutId, {
        lastModifiedTime: now,
      });

      // Return updated workout
      const updatedWorkout = await workoutRepository.findById(result.workoutId);

      if (!updatedWorkout) {
        throw new AppError('Workout not found after set update', 500);
      }

      return updatedWorkout;
    },

    /**
     * Complete a set (same as updateSet but with specific fields)
     */
    async completeSet(
      setId: string,
      completionData: {
        reps?: number;
        weight?: number;
        rpe?: number;
      }
    ): Promise<WorkoutType> {
      // Just delegate to updateSet
      return this.updateSet(setId, completionData);
    },
  };
}

/**
 * Type definition for WorkoutService (inferred from factory return type)
 */
export type WorkoutService = ReturnType<typeof createWorkoutService>;
