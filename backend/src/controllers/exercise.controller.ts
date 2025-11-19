import { Response } from 'express';
import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import type { ExerciseService } from '../services/exercise.service';
import type { ExerciseSearchService } from '../services/exerciseSearch.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

/**
 * Create Exercise Controller with injected dependencies
 * Factory function pattern for dependency injection
 */
export function createExerciseController(
  exerciseService: ExerciseService,
  exerciseSearchService: ExerciseSearchService
) {
  return {
    /**
     * List exercises with optional filtering and pagination
     * GET /api/exercises
     */
    getExercises: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { tag, search, page, limit } = req.query;

      const result = await exerciseService.listExercises(
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
    }),

    /**
     * Get a single exercise by ID
     * GET /api/exercises/:id
     */
    getExercise: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const exercise = await exerciseService.getExerciseById(req.params.id);

      res.json({
        success: true,
        data: exercise,
      });
    }),

    /**
     * Create a new exercise
     * POST /api/exercises
     */
    createNewExercise: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const exercise = await exerciseService.createExercise(
        req.body as { slug: string; name: string; tags?: string[] }
      );

      res.status(201).json({
        success: true,
        data: exercise,
      });
    }),

    /**
     * Update an existing exercise
     * PUT /api/exercises/:id
     */
    updateExistingExercise: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const exercise = await exerciseService.updateExercise(
        req.params.id,
        req.body as Partial<{ slug: string; name: string; tags?: string[] }>
      );

      res.json({
        success: true,
        data: exercise,
      });
    }),

    /**
     * Delete an exercise
     * DELETE /api/exercises/:id
     */
    deleteExistingExercise: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      await exerciseService.deleteExercise(req.params.id);

      res.json({
        success: true,
        message: 'Exercise deleted successfully',
      });
    }),

    /**
     * Search exercises by name with fuzzy matching
     * GET /api/exercises/search
     */
    searchExercises: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { q, limit } = req.query;

      const results = await exerciseSearchService.searchByName(q as string, {
        limit: limit !== undefined ? parseInt(limit as string) : 5,
      });

      res.json({
        success: true,
        data: {
          results,
        },
      });
    }),
  };
}

/**
 * Type definition for ExerciseController (inferred from factory return type)
 */
export type ExerciseController = ReturnType<typeof createExerciseController>;
