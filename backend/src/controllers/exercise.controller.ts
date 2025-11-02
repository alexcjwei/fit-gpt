import { Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import {
  listExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../services/exercise.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { ExerciseSearchService } from '../services/exerciseSearch.service';

/**
 * List exercises with optional filtering and pagination
 * GET /api/exercises
 */
export const getExercises = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const { category, muscleGroup, equipment, difficulty, search, page, limit } = req.query;

  const result = await listExercises(
    {
      category: category as any,
      muscleGroup: muscleGroup as any,
      equipment: equipment as any,
      difficulty: difficulty as any,
      search: search as string,
    },
    {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    }
  );

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Get a single exercise by ID
 * GET /api/exercises/:id
 */
export const getExercise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const exercise = await getExerciseById(req.params.id);

  res.json({
    success: true,
    data: exercise,
  });
});

/**
 * Create a new exercise
 * POST /api/exercises
 */
export const createNewExercise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const exercise = await createExercise(req.body);

  res.status(201).json({
    success: true,
    data: exercise,
  });
});

/**
 * Update an existing exercise
 * PUT /api/exercises/:id
 */
export const updateExistingExercise = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const exercise = await updateExercise(req.params.id, req.body);

    res.json({
      success: true,
      data: exercise,
    });
  }
);

/**
 * Delete an exercise
 * DELETE /api/exercises/:id
 */
export const deleteExistingExercise = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    await deleteExercise(req.params.id);

    res.json({
      success: true,
      message: 'Exercise deleted successfully',
    });
  }
);

/**
 * Search exercises by name with fuzzy matching
 * GET /api/exercises/search
 */
export const searchExercises = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { q, limit } = req.query;

    const searchService = new ExerciseSearchService();
    const results = await searchService.searchByName(q as string, {
      limit: limit ? parseInt(limit as string) : 5,
    });

    res.json({
      success: true,
      data: {
        results,
      },
    });
  }
);
