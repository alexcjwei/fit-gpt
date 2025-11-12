import { Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
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
  reorderBlocks,
  addExercise,
  removeExercise,
  reorderExercises,
  updateSet,
  completeSet,
} from '../services/workout.service';
import type { ExerciseInstanceInput } from '../services/workout.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest, Workout as WorkoutType, WorkoutBlock } from '../types';

// ============================================
// Core CRUD Controllers
// ============================================

/**
 * List workouts for the authenticated user
 * GET /api/workouts
 */
export const getWorkouts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  if (req.userId === undefined) {
    throw new AppError('Unauthorized', 401);
  }

  const { dateFrom, dateTo, page, limit } = req.query;

  const result = await listWorkouts(
    req.userId,
    {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    },
    {
      page: page !== undefined ? parseInt(page as string) : 1,
      limit: limit !== undefined ? parseInt(limit as string) : 50,
    }
  );

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Get a single workout by ID
 * GET /api/workouts/:id
 */
export const getWorkout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const workout = await getWorkoutById(req.params.id);

  // Verify ownership
  if (req.userId === undefined) {
    throw new AppError('Unauthorized', 401);
  }

  res.json({
    success: true,
    data: workout,
  });
});

/**
 * Create a new workout
 * POST /api/workouts
 */
export const createNewWorkout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  if (req.userId === undefined) {
    throw new AppError('Unauthorized', 401);
  }

  const workout = await createWorkout(
    req.userId,
    req.body as Omit<WorkoutType, 'id' | 'lastModifiedTime'>
  );

  res.status(201).json({
    success: true,
    data: workout,
  });
});

/**
 * Update an existing workout
 * PUT /api/workouts/:id
 */
export const updateExistingWorkout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const workout = await updateWorkout(
      req.params.id,
      req.body as Partial<{ name: string; date: string; notes?: string }>
    );

    res.json({
      success: true,
      data: workout,
    });
  }
);

/**
 * Delete a workout
 * DELETE /api/workouts/:id
 */
export const deleteExistingWorkout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    await deleteWorkout(req.params.id);

    res.json({
      success: true,
      message: 'Workout deleted successfully',
    });
  }
);

// ============================================
// Common Workout Operations
// ============================================

/**
 * Duplicate a workout
 * POST /api/workouts/:id/duplicate
 */
export const duplicateExistingWorkout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    if (req.userId === undefined) {
      throw new AppError('Unauthorized', 401);
    }

    const { newDate } = req.body as { newDate?: string };

    const workout = await duplicateWorkout(req.params.id, req.userId, newDate);

    res.status(201).json({
      success: true,
      data: workout,
    });
  }
);

/**
 * Get workouts by date range for calendar view
 * GET /api/workouts/calendar
 */
export const getWorkoutsByRange = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  if (req.userId === undefined) {
    throw new AppError('Unauthorized', 401);
  }

  const { startDate, endDate } = req.query;

  if (startDate === undefined || endDate === undefined) {
    throw new AppError('startDate and endDate are required', 400);
  }

  const workouts = await getWorkoutsByDateRange(req.userId, startDate as string, endDate as string);

  res.json({
    success: true,
    data: workouts,
  });
});

// ============================================
// Block Controllers
// ============================================

/**
 * Add a block to a workout
 * POST /api/workouts/:workoutId/blocks
 */
export const addBlockToWorkout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const workout = await addBlock(req.params.workoutId, req.body as Omit<WorkoutBlock, 'id'>);

  res.status(201).json({
    success: true,
    data: workout,
  });
});

/**
 * Remove a block from a workout
 * DELETE /api/blocks/:blockId
 */
export const removeBlockFromWorkout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const workout = await removeBlock(req.params.blockId);

    res.json({
      success: true,
      data: workout,
    });
  }
);

/**
 * Reorder blocks within a workout
 * PUT /api/workouts/:workoutId/blocks/reorder
 */
export const reorderBlocksInWorkout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { blockOrders } = req.body as { blockOrders?: unknown[] };

    if (blockOrders === undefined || !Array.isArray(blockOrders)) {
      throw new AppError('blockOrders array is required', 400);
    }

    const workout = await reorderBlocks(
      req.params.workoutId,
      blockOrders as Array<{ blockId: string; order: number }>
    );

    res.json({
      success: true,
      data: workout,
    });
  }
);

// ============================================
// Exercise Controllers
// ============================================

/**
 * Add an exercise to a block
 * POST /api/blocks/:blockId/exercises
 */
export const addExerciseToBlock = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const workout = await addExercise(req.params.blockId, req.body as ExerciseInstanceInput);

  res.status(201).json({
    success: true,
    data: workout,
  });
});

/**
 * Remove an exercise from a block
 * DELETE /api/exercises/:exerciseId
 */
export const removeExerciseFromBlock = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const workout = await removeExercise(req.params.exerciseId);

    res.json({
      success: true,
      data: workout,
    });
  }
);

/**
 * Reorder exercises within a block
 * PUT /api/blocks/:blockId/exercises/reorder
 */
export const reorderExercisesInBlock = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { exerciseOrders } = req.body as { exerciseOrders?: unknown[] };

    if (exerciseOrders === undefined || !Array.isArray(exerciseOrders)) {
      throw new AppError('exerciseOrders array is required', 400);
    }

    const workout = await reorderExercises(
      req.params.blockId,
      exerciseOrders as Array<{ exerciseId: string; orderInBlock: number }>
    );

    res.json({
      success: true,
      data: workout,
    });
  }
);

// ============================================
// Set Controllers
// ============================================

/**
 * Update a set
 * PUT /api/sets/:setId
 */
export const updateSetData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const workout = await updateSet(
    req.params.setId,
    req.body as Partial<{
      reps?: number | null;
      weight?: number | null;
      weightUnit?: 'lbs' | 'kg';
      duration?: number | null;
      rpe?: number | null;
      notes?: string | null;
    }>
  );

  res.json({
    success: true,
    data: workout,
  });
});

/**
 * Complete a set
 * POST /api/sets/:setId/complete
 */
export const completeExistingSet = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const workout = await completeSet(
      req.params.setId,
      req.body as {
        reps?: number;
        weight?: number;
        weightUnit?: 'lbs' | 'kg';
        duration?: number;
        rpe?: number;
        notes?: string;
      }
    );

    res.json({
      success: true,
      data: workout,
    });
  }
);
