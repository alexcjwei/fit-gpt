import { Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import type { WorkoutService, ExerciseInstanceInput } from '../services/workout.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest, Workout as WorkoutType, WorkoutBlock } from '../types';

/**
 * Create Workout Controller with injected dependencies
 * Factory function pattern for dependency injection
 */
export function createWorkoutController(workoutService: WorkoutService) {
  return {
    // ============================================
    // Core CRUD Controllers
    // ============================================

    /**
     * List workouts for the authenticated user
     * GET /api/workouts
     */
    getWorkouts: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  if (req.userId === undefined) {
    throw new AppError('Unauthorized', 401);
  }

  const { dateFrom, dateTo, page, limit } = req.query;

      const result = await workoutService.listWorkouts(
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
    }),

    /**
 * Get a single workout by ID
 * GET /api/workouts/:id
 */
getWorkout: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  // Verify authentication
  if (req.userId === undefined) {
    throw new AppError('Unauthorized', 401);
  }

  const workout = await workoutService.getWorkoutById(req.params.id, req.userId);

  res.json({
    success: true,
    data: workout,
  });
    }),

    /**
 * Create a new workout
 * POST /api/workouts
 */
createNewWorkout: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  if (req.userId === undefined) {
    throw new AppError('Unauthorized', 401);
  }

  const workout = await workoutService.createWorkout(
    req.userId,
    req.body as Omit<WorkoutType, 'id' | 'lastModifiedTime'>
  );

  res.status(201).json({
    success: true,
    data: workout,
  });
    }),

    /**
 * Update an existing workout
 * PUT /api/workouts/:id
 */
updateExistingWorkout: asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    // Verify authentication
    if (req.userId === undefined) {
      throw new AppError('Unauthorized', 401);
    }

    const workout = await workoutService.updateWorkout(
      req.params.id,
      req.userId,
      req.body as Partial<{ name: string; date: string; notes?: string }>
    );

    res.json({
      success: true,
      data: workout,
    });
    }),

/**
 * Delete a workout
 * DELETE /api/workouts/:id
 */
deleteExistingWorkout: asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    // Verify authentication
    if (req.userId === undefined) {
      throw new AppError('Unauthorized', 401);
    }

    await workoutService.deleteWorkout(req.params.id, req.userId);

    res.json({
      success: true,
      message: 'Workout deleted successfully',
    });
    }),

// ============================================
// Common Workout Operations
// ============================================

/**
 * Duplicate a workout
 * POST /api/workouts/:id/duplicate
 */
duplicateExistingWorkout: asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    if (req.userId === undefined) {
      throw new AppError('Unauthorized', 401);
    }

    const { newDate } = req.body as { newDate?: string };

    const workout = await workoutService.duplicateWorkout(req.params.id, req.userId, newDate);

    res.status(201).json({
      success: true,
      data: workout,
    });
    }),

/**
 * Get workouts by date range for calendar view
 * GET /api/workouts/calendar
 */
getWorkoutsByRange: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

  const workouts = await workoutService.getWorkoutsByDateRange(req.userId, startDate as string, endDate as string);

  res.json({
    success: true,
    data: workouts,
  });
    }),

    // ============================================
    // Block Controllers
    // ============================================

/**
 * Add a block to a workout
 * POST /api/workouts/:workoutId/blocks
 */
addBlockToWorkout: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const workout = await workoutService.addBlock(req.params.workoutId, req.body as Omit<WorkoutBlock, 'id'>);

  res.status(201).json({
    success: true,
    data: workout,
  });
    }),

    /**
 * Remove a block from a workout
 * DELETE /api/blocks/:blockId
 */
removeBlockFromWorkout: asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const workout = await workoutService.removeBlock(req.params.blockId);

    res.json({
      success: true,
      data: workout,
    });
    }),

/**
 * Reorder blocks within a workout
 * PUT /api/workouts/:workoutId/blocks/reorder
 */
reorderBlocksInWorkout: asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { blockOrders } = req.body as { blockOrders?: unknown[] };

    if (blockOrders === undefined || !Array.isArray(blockOrders)) {
      throw new AppError('blockOrders array is required', 400);
    }

    const workout = await workoutService.reorderBlocks(
      req.params.workoutId,
      blockOrders as Array<{ blockId: string; order: number }>
    );

    res.json({
      success: true,
      data: workout,
    });
    }),

// ============================================
// Exercise Controllers
// ============================================

/**
 * Add an exercise to a block
 * POST /api/blocks/:blockId/exercises
 */
addExerciseToBlock: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const workout = await workoutService.addExercise(req.params.blockId, req.body as ExerciseInstanceInput);

  res.status(201).json({
    success: true,
    data: workout,
  });
    }),

    /**
 * Remove an exercise from a block
 * DELETE /api/exercises/:exerciseId
 */
removeExerciseFromBlock: asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const workout = await workoutService.removeExercise(req.params.exerciseId);

    res.json({
      success: true,
      data: workout,
    });
    }),

/**
 * Reorder exercises within a block
 * PUT /api/blocks/:blockId/exercises/reorder
 */
reorderExercisesInBlock: asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { exerciseOrders } = req.body as { exerciseOrders?: unknown[] };

    if (exerciseOrders === undefined || !Array.isArray(exerciseOrders)) {
      throw new AppError('exerciseOrders array is required', 400);
    }

    const workout = await workoutService.reorderExercises(
      req.params.blockId,
      exerciseOrders as Array<{ exerciseId: string; orderInBlock: number }>
    );

    res.json({
      success: true,
      data: workout,
    });
    }),

// ============================================
// Set Controllers
// ============================================

/**
 * Update a set
 * PUT /api/sets/:setId
 */
updateSetData: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const workout = await workoutService.updateSet(
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
    }),

    /**
 * Complete a set
 * POST /api/sets/:setId/complete
 */
completeExistingSet: asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const workout = await workoutService.completeSet(
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
    }),
  };
}

/**
 * Type definition for WorkoutController (inferred from factory return type)
 */
export type WorkoutController = ReturnType<typeof createWorkoutController>;
