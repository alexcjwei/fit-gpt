import mongoose from 'mongoose';
import { Exercise, IExercise } from '../models/Exercise';
import { AppError } from '../middleware/errorHandler';
import {
  ExerciseCategory,
  MuscleGroup,
  Equipment,
  DifficultyLevel,
  Exercise as ExerciseType,
} from '../types';

export interface ExerciseFilters {
  category?: ExerciseCategory;
  muscleGroup?: MuscleGroup;
  equipment?: Equipment;
  difficulty?: DifficultyLevel;
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
 * Convert Mongoose document to Exercise type
 */
const toExerciseType = (doc: IExercise): ExerciseType => {
  return {
    id: (doc._id).toString(),
    slug: doc.slug,
    name: doc.name,
    category: doc.category,
    primaryMuscles: doc.primaryMuscles,
    secondaryMuscles: doc.secondaryMuscles,
    equipment: doc.equipment,
    difficulty: doc.difficulty,
    movementPattern: doc.movementPattern,
    isUnilateral: doc.isUnilateral,
    isCompound: doc.isCompound,
    description: doc.description,
    setupInstructions: doc.setupInstructions,
    formCues: doc.formCues,
    videoUrl: doc.videoUrl,
    alternativeExerciseIds: doc.alternativeExerciseIds,
    tags: doc.tags,
  };
};

/**
 * List exercises with optional filtering and pagination
 */
export const listExercises = async (
  filters: ExerciseFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 50 }
): Promise<PaginatedExerciseResponse> => {
  // Build query
  const query: Record<string, unknown> = {};

  if (filters.category !== undefined && filters.category !== null) {
    query.category = filters.category;
  }

  if (filters.muscleGroup !== undefined && filters.muscleGroup !== null) {
    query.primaryMuscles = filters.muscleGroup;
  }

  if (filters.equipment !== undefined && filters.equipment !== null) {
    query.equipment = { $in: [filters.equipment] };
  }

  if (filters.difficulty !== undefined && filters.difficulty !== null) {
    query.difficulty = filters.difficulty;
  }

  if (filters.search !== undefined && filters.search !== null && filters.search !== '') {
    query.name = { $regex: filters.search, $options: 'i' };
  }

  // Calculate pagination
  const skip = (pagination.page - 1) * pagination.limit;

  // Execute query with pagination
  const [exercises, total] = await Promise.all([
    Exercise.find(query as mongoose.FilterQuery<IExercise>)
      .sort({ name: 1 })
      .skip(skip)
      .limit(pagination.limit),
    Exercise.countDocuments(query as mongoose.FilterQuery<IExercise>),
  ]);

  return {
    exercises: exercises.map((doc) => toExerciseType(doc)),
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
  let exercise: IExercise | null = null;

  // Try to find by MongoDB ObjectId first
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    exercise = await Exercise.findById(idOrSlug);
  }

  // If not found by ID, try finding by slug
  if (exercise === null || exercise === undefined) {
    exercise = await Exercise.findOne({ slug: idOrSlug.toLowerCase() });
  }

  if (exercise === null || exercise === undefined) {
    throw new AppError('Exercise not found', 404);
  }

  return toExerciseType(exercise);
};

/**
 * Create a new exercise
 */
export const createExercise = async (
  exerciseData: Omit<ExerciseType, 'id'>
): Promise<ExerciseType> => {
  // Check for duplicate exercise name
  const existingExercise = await Exercise.findOne({ name: exerciseData.name });
  if (existingExercise !== null && existingExercise !== undefined) {
    throw new AppError('Exercise with this name already exists', 400);
  }

  const exercise = await Exercise.create(exerciseData);

  return toExerciseType(exercise);
};

/**
 * Update an existing exercise
 */
export const updateExercise = async (
  id: string,
  exerciseData: Partial<Omit<ExerciseType, 'id'>>
): Promise<ExerciseType> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid exercise ID', 400);
  }

  // If updating name, check for duplicates
  if (exerciseData.name !== undefined && exerciseData.name !== null && exerciseData.name !== '') {
    const existingExercise = await Exercise.findOne({
      name: exerciseData.name,
      _id: { $ne: id },
    });
    if (existingExercise !== null && existingExercise !== undefined) {
      throw new AppError('Exercise with this name already exists', 400);
    }
  }

  const exercise = await Exercise.findByIdAndUpdate(id, exerciseData, {
    new: true,
    runValidators: true,
  });

  if (exercise === null || exercise === undefined) {
    throw new AppError('Exercise not found', 404);
  }

  return toExerciseType(exercise);
};

/**
 * Delete an exercise
 */
export const deleteExercise = async (id: string): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid exercise ID', 400);
  }

  const exercise = await Exercise.findByIdAndDelete(id);

  if (exercise === null || exercise === undefined) {
    throw new AppError('Exercise not found', 404);
  }
};
