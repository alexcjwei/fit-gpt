import type { ExerciseRepository } from '../repositories/ExerciseRepository';
import type { ExerciseCacheService } from './exerciseCache.service';
import { AppError } from '../middleware/errorHandler';
import { Exercise as ExerciseType } from '../types';

export interface ExerciseFilters {
  tag?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedExerciseResponse {
  exercises: ExerciseType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Create Exercise Service with injected dependencies
 * Factory function pattern for dependency injection
 */
export function createExerciseService(
  exerciseRepository: ExerciseRepository,
  cacheService?: ExerciseCacheService
) {
  return {
    /**
     * List exercises with optional filtering and pagination
     */
    async listExercises(
      filters: ExerciseFilters = {},
      pagination: PaginationOptions = { page: 1, limit: 50 }
    ): Promise<PaginatedExerciseResponse> {
      // Build repository filters
      const repoFilters = {
        tags: filters.tag ? [filters.tag] : undefined,
        nameQuery: filters.search,
      };

      // Get all matching exercises (repository doesn't paginate, so we do it in memory)
      const allExercises = await exerciseRepository.findAll(repoFilters);

      // Apply pagination
      const start = (pagination.page - 1) * pagination.limit;
      const end = start + pagination.limit;
      const exercises = allExercises.slice(start, end);
      const total = allExercises.length;

      return {
        exercises,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      };
    },

    /**
     * Get a single exercise by ID or slug
     */
    async getExerciseById(idOrSlug: string): Promise<ExerciseType> {
      let exercise;

      // Try to find by ID first (numeric ID)
      if (/^\d+$/.test(idOrSlug)) {
        exercise = await exerciseRepository.findById(idOrSlug);
      }

      // If not found by ID, try finding by slug
      if (!exercise) {
        exercise = await exerciseRepository.findBySlug(idOrSlug.toLowerCase());
      }

      if (!exercise) {
        throw new AppError('Exercise not found', 404);
      }

      return exercise;
    },

    /**
     * Create a new exercise
     */
    async createExercise(exerciseData: Omit<ExerciseType, 'id'>): Promise<ExerciseType> {
      // Check for duplicate exercise name
      const exists = await exerciseRepository.checkDuplicateName(exerciseData.name);
      if (exists) {
        throw new AppError('Exercise with this name already exists', 400);
      }

      const exercise = await exerciseRepository.create({
        slug: exerciseData.slug,
        name: exerciseData.name,
        tags: exerciseData.tags || [],
        needsReview: exerciseData.needsReview,
      });

      // Populate cache with new exercise
      if (cacheService) {
        const normalizedName = cacheService.getNormalizedName(exercise.name);
        await cacheService.set(normalizedName, exercise.id);
      }

      return exercise;
    },

    /**
     * Update an existing exercise
     */
    async updateExercise(
      id: string,
      exerciseData: Partial<Omit<ExerciseType, 'id'>>
    ): Promise<ExerciseType> {
      // Verify ID is numeric
      if (!/^\d+$/.test(id)) {
        throw new AppError('Invalid exercise ID', 400);
      }

      // Fetch old exercise to invalidate cache if name changes
      const oldExercise = cacheService ? await exerciseRepository.findById(id) : null;

      // If updating name, check for duplicates (excluding current exercise)
      if (
        exerciseData.name !== undefined &&
        exerciseData.name !== null &&
        exerciseData.name !== ''
      ) {
        const exists = await exerciseRepository.checkDuplicateName(exerciseData.name, id);
        if (exists) {
          throw new AppError('Exercise with this name already exists', 400);
        }
      }

      const exercise = await exerciseRepository.update(id, {
        slug: exerciseData.slug,
        name: exerciseData.name,
        tags: exerciseData.tags,
        needsReview: exerciseData.needsReview,
      });

      if (!exercise) {
        throw new AppError('Exercise not found', 404);
      }

      // Invalidate cache for old name and set cache for new name
      if (cacheService && oldExercise) {
        // Invalidate old name
        const oldNormalizedName = cacheService.getNormalizedName(oldExercise.name);
        await cacheService.invalidate(oldNormalizedName);

        // Set cache for new name
        const newNormalizedName = cacheService.getNormalizedName(exercise.name);
        await cacheService.set(newNormalizedName, exercise.id);
      }

      return exercise;
    },

    /**
     * Delete an exercise
     */
    async deleteExercise(id: string): Promise<void> {
      // Verify ID is numeric
      if (!/^\d+$/.test(id)) {
        throw new AppError('Invalid exercise ID', 400);
      }

      // Fetch exercise to invalidate cache
      const exercise = cacheService ? await exerciseRepository.findById(id) : null;

      const deleted = await exerciseRepository.delete(id);

      if (!deleted) {
        throw new AppError('Exercise not found', 404);
      }

      // Invalidate cache for deleted exercise
      if (cacheService && exercise) {
        const normalizedName = cacheService.getNormalizedName(exercise.name);
        await cacheService.invalidate(normalizedName);
      }
    },
  };
}

/**
 * Type definition for ExerciseService (inferred from factory return type)
 */
export type ExerciseService = ReturnType<typeof createExerciseService>;
