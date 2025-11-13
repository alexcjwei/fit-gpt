import { ExerciseRepository } from '../repositories/ExerciseRepository';
import { db } from '../db';
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

// Singleton repository instance
let repository: ExerciseRepository | null = null;

const getRepository = (): ExerciseRepository => {
  if (!repository) {
    repository = new ExerciseRepository(db);
  }
  return repository;
};

/**
 * List exercises with optional filtering and pagination
 */
export const listExercises = async (
  filters: ExerciseFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 50 }
): Promise<PaginatedExerciseResponse> => {
  const repo = getRepository();

  // Use repository filter method
  const { exercises, total} = await repo.filter({
    tag: filters.tag,
    search: filters.search,
    page: pagination.page,
    limit: pagination.limit,
  });

  return {
    exercises,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  };
};

/**
 * Get a single exercise by ID or slug
 */
export const getExerciseById = async (idOrSlug: string): Promise<ExerciseType> => {
  const repo = getRepository();
  let exercise;

  // Try to find by ID first (numeric ID)
  if (/^\d+$/.test(idOrSlug)) {
    exercise = await repo.findById(idOrSlug);
  }

  // If not found by ID, try finding by slug
  if (!exercise) {
    exercise = await repo.findBySlug(idOrSlug.toLowerCase());
  }

  if (!exercise) {
    throw new AppError('Exercise not found', 404);
  }

  return exercise;
};

/**
 * Create a new exercise
 */
export const createExercise = async (
  exerciseData: Omit<ExerciseType, 'id'>
): Promise<ExerciseType> => {
  const repo = getRepository();

  // Check for duplicate exercise name
  const exists = await repo.existsByName(exerciseData.name);
  if (exists) {
    throw new AppError('Exercise with this name already exists', 400);
  }

  const exercise = await repo.create({
    slug: exerciseData.slug,
    name: exerciseData.name,
    tags: exerciseData.tags || [],
    needsReview: exerciseData.needsReview,
  });

  return exercise;
};

/**
 * Update an existing exercise
 */
export const updateExercise = async (
  id: string,
  exerciseData: Partial<Omit<ExerciseType, 'id'>>
): Promise<ExerciseType> => {
  const repo = getRepository();

  // Verify ID is numeric
  if (!/^\d+$/.test(id)) {
    throw new AppError('Invalid exercise ID', 400);
  }

  // If updating name, check for duplicates
  if (exerciseData.name !== undefined && exerciseData.name !== null && exerciseData.name !== '') {
    const exists = await repo.existsByName(exerciseData.name);
    if (exists) {
      // Check if it's not the same exercise being updated
      const existing = await repo.findById(id);
      if (existing && existing.name !== exerciseData.name) {
        throw new AppError('Exercise with this name already exists', 400);
      }
    }
  }

  const exercise = await repo.update(id, {
    slug: exerciseData.slug,
    name: exerciseData.name,
    tags: exerciseData.tags,
    needsReview: exerciseData.needsReview,
  });

  if (!exercise) {
    throw new AppError('Exercise not found', 404);
  }

  return exercise;
};

/**
 * Delete an exercise
 */
export const deleteExercise = async (id: string): Promise<void> => {
  const repo = getRepository();

  // Verify ID is numeric
  if (!/^\d+$/.test(id)) {
    throw new AppError('Invalid exercise ID', 400);
  }

  const deleted = await repo.delete(id);

  if (!deleted) {
    throw new AppError('Exercise not found', 404);
  }
};
