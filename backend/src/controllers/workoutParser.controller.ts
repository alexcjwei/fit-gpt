import { Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import { WorkoutParserService } from '../services/workoutParser';
import { createWorkout, getWorkoutById } from '../services/workout.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

/**
 * Parse workout text into structured workout object and save to database
 * POST /api/workouts/parse
 */
export const parseWorkout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { text, date, weightUnit } = req.body;

    if (!req.userId) {
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
    const savedWorkout = await createWorkout(req.userId, {
      name: parsedWorkout.name,
      date: parsedWorkout.date,
      notes: parsedWorkout.notes,
      blocks: parsedWorkout.blocks,
    });

    // Retrieve the saved workout with resolved exercise names
    const workoutWithNames = await getWorkoutById(savedWorkout.id);

    res.json({
      success: true,
      data: workoutWithNames,
    });
  }
);
