import { Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import { WorkoutParserService } from '../services/workoutParser';
import type { WorkoutService } from '../services/workout.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

/**
 * Create Workout Parser Controller with injected dependencies
 * Factory function pattern for dependency injection
 */
export function createWorkoutParserController(workoutService: WorkoutService) {
  return {
    /**
     * Parse workout text into structured workout object and save to database
     * POST /api/workouts/parse
     */
    parseWorkout: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const { text, date, weightUnit } = req.body as {
    text: string;
    date?: string;
    weightUnit?: 'lbs' | 'kg';
  };

  if (req.userId === undefined) {
    throw new AppError('User ID is required', 401);
  }

  // Parse the workout
  const parserService = new WorkoutParserService();
  const parsedWorkout = await parserService.parse(text, {
    date,
    weightUnit,
    userId: req.userId,
  });

  // Save the parsed workout to database
  const savedWorkout = await workoutService.createWorkout(req.userId, {
    name: parsedWorkout.name,
    date: parsedWorkout.date,
    notes: parsedWorkout.notes,
    blocks: parsedWorkout.blocks,
  });

  // Retrieve the saved workout with resolved exercise names
  const workoutWithNames = await workoutService.getWorkoutById(savedWorkout.id);

  res.json({
    success: true,
    data: workoutWithNames,
  });
    }),
  };
}

/**
 * Type definition for WorkoutParserController (inferred from factory return type)
 */
export type WorkoutParserController = ReturnType<typeof createWorkoutParserController>;
