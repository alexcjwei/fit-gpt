import { Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import { getDatabase } from '../middleware/database';
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

  const { tag, search, page, limit } = req.query;
  const db = getDatabase(res);

  const result = await listExercises(
    db,
    {
      tag: tag as string,
      search: search as string,
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
 * Get a single exercise by ID
 * GET /api/exercises/:id
 */
export const getExercise = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const db = getDatabase(res);
  const exercise = await getExerciseById(db, req.params.id);

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

  const db = getDatabase(res);
  const exercise = await createExercise(
    db,
    req.body as { slug: string; name: string; tags?: string[] }
  );

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

    const db = getDatabase(res);
    const exercise = await updateExercise(
      db,
      req.params.id,
      req.body as Partial<{ slug: string; name: string; tags?: string[] }>
    );

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

    const db = getDatabase(res);
    await deleteExercise(db, req.params.id);

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
export const searchExercises = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const { q, limit } = req.query;

  const searchService = new ExerciseSearchService();
  const results = await searchService.searchByName(q as string, {
    limit: limit !== undefined ? parseInt(limit as string) : 5,
  });

  res.json({
    success: true,
    data: {
      results,
    },
  });
});
