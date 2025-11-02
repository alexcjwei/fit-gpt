import { Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import { WorkoutParserService } from '../services/workoutParser';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

/**
 * Parse workout text into structured workout object
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

    // Parse the workout
    const parserService = new WorkoutParserService();
    const workout = await parserService.parse(text, {
      date,
      weightUnit,
    });

    res.json({
      success: true,
      data: workout,
    });
  }
);
