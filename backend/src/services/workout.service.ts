import mongoose from 'mongoose';
import { Workout, IWorkout } from '../models/Workout';
import { Exercise } from '../models/Exercise';
import { AppError } from '../middleware/errorHandler';
import {
  Workout as WorkoutType,
  WorkoutBlock,
  ExerciseInstance,
  SetInstance,
  WorkoutResponse,
  WorkoutBlockResponse,
  ExerciseInstanceResponse,
} from '../types';
import { randomUUID } from 'crypto';

export interface WorkoutFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Type for creating a new exercise (without generated IDs)
export type ExerciseInstanceInput = Omit<ExerciseInstance, 'id' | 'sets'> & {
  sets: Array<Omit<SetInstance, 'id'>>;
};

export interface PaginatedWorkoutResponse {
  workouts: WorkoutType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Convert Mongoose document to Workout type
 */
const toWorkoutType = (doc: IWorkout): WorkoutType => {
  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    name: doc.name,
    date: doc.date,
    lastModifiedTime: doc.lastModifiedTime,
    notes: doc.notes,
    blocks: doc.blocks,
  };
};

/**
 * Resolve exercise names from exercise IDs in a workout
 * Returns a WorkoutResponse with exercise names populated
 */
const resolveExerciseNames = async (workout: WorkoutType): Promise<WorkoutResponse> => {
  // Collect all unique exercise IDs from the workout
  const exerciseIds = new Set<string>();
  for (const block of workout.blocks) {
    for (const exercise of block.exercises) {
      exerciseIds.add(exercise.exerciseId);
    }
  }

  // Fetch all exercises in one query
  const exercises = await Exercise.find({
    _id: { $in: Array.from(exerciseIds).map(id => new mongoose.Types.ObjectId(id)) }
  });

  // Create a map of exerciseId to exercise name
  const exerciseNameMap = new Map<string, string>();
  for (const exercise of exercises) {
    const exerciseId = (exercise._id as mongoose.Types.ObjectId).toString();
    exerciseNameMap.set(exerciseId, exercise.name);
  }

  // Transform blocks and exercises to include exercise names
  const blocksWithNames: WorkoutBlockResponse[] = workout.blocks.map(block => {
    const exercisesWithNames: ExerciseInstanceResponse[] = block.exercises.map(exercise => {
      return {
        ...exercise,
        exerciseName: exerciseNameMap.get(exercise.exerciseId) || 'Unknown Exercise',
      };
    });

    return {
      ...block,
      exercises: exercisesWithNames,
    };
  });

  return {
    ...workout,
    blocks: blocksWithNames,
  };
};

/**
 * Generate new UUIDs for blocks, exercises, and sets
 */
const regenerateIds = (blocks: WorkoutBlock[]): WorkoutBlock[] => {
  return blocks.map((block) => ({
    ...block,
    id: randomUUID(),
    exercises: block.exercises.map((exercise) => ({
      ...exercise,
      id: randomUUID(),
      sets: exercise.sets.map((set) => ({
        ...set,
        id: randomUUID(),
      })),
    })),
  }));
};

/**
 * Create a new workout
 */
export const createWorkout = async (
  userId: string,
  workoutData: Omit<WorkoutType, 'id' | 'lastModifiedTime'>
): Promise<WorkoutType> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user ID', 400);
  }

  const now = new Date().toISOString();

  const workout = await Workout.create({
    userId: new mongoose.Types.ObjectId(userId),
    ...workoutData,
    lastModifiedTime: now,
  });

  return toWorkoutType(workout);
};

/**
 * Get a single workout by ID
 * Returns workout with resolved exercise names for frontend display
 */
export const getWorkoutById = async (workoutId: string): Promise<WorkoutResponse> => {
  if (!mongoose.Types.ObjectId.isValid(workoutId)) {
    throw new AppError('Invalid workout ID', 400);
  }

  const workout = await Workout.findById(workoutId).lean();

  if (!workout) {
    throw new AppError('Workout not found', 404);
  }

  const workoutType = toWorkoutType(workout as unknown as IWorkout);
  return await resolveExerciseNames(workoutType);
};

/**
 * Update an existing workout
 */
export const updateWorkout = async (
  workoutId: string,
  updates: Partial<Omit<WorkoutType, 'id' | 'lastModifiedTime'>>
): Promise<WorkoutType> => {
  if (!mongoose.Types.ObjectId.isValid(workoutId)) {
    throw new AppError('Invalid workout ID', 400);
  }

  const now = new Date().toISOString();

  const workout = await Workout.findByIdAndUpdate(
    workoutId,
    {
      ...updates,
      lastModifiedTime: now,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!workout) {
    throw new AppError('Workout not found', 404);
  }

  return toWorkoutType(workout);
};

/**
 * Delete a workout
 */
export const deleteWorkout = async (workoutId: string): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(workoutId)) {
    throw new AppError('Invalid workout ID', 400);
  }

  const workout = await Workout.findByIdAndDelete(workoutId);

  if (!workout) {
    throw new AppError('Workout not found', 404);
  }
};

/**
 * List workouts with optional filtering and pagination
 */
export const listWorkouts = async (
  userId: string,
  filters: WorkoutFilters = {},
  pagination: PaginationOptions = { page: 1, limit: 50 }
): Promise<PaginatedWorkoutResponse> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user ID', 400);
  }

  // Build query
  const query: any = { userId: new mongoose.Types.ObjectId(userId) };

  if (filters.dateFrom || filters.dateTo) {
    query.date = {};
    if (filters.dateFrom) query.date.$gte = filters.dateFrom;
    if (filters.dateTo) query.date.$lte = filters.dateTo;
  }

  // Calculate pagination
  const skip = (pagination.page - 1) * pagination.limit;

  // Execute query with pagination
  const [workouts, total] = await Promise.all([
    Workout.find(query)
      .sort({ date: -1, lastModifiedTime: -1 })
      .skip(skip)
      .limit(pagination.limit),
    Workout.countDocuments(query),
  ]);

  return {
    workouts: workouts.map((doc) => toWorkoutType(doc)),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  };
};

/**
 * Duplicate a workout to a new date
 */
export const duplicateWorkout = async (
  workoutId: string,
  userId: string,
  newDate?: string
): Promise<WorkoutType> => {
  if (!mongoose.Types.ObjectId.isValid(workoutId)) {
    throw new AppError('Invalid workout ID', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user ID', 400);
  }

  const originalWorkout = await Workout.findById(workoutId);

  if (!originalWorkout) {
    throw new AppError('Workout not found', 404);
  }

  const now = new Date().toISOString();
  const targetDate = newDate || originalWorkout.date;

  // Regenerate UUIDs for all nested items and reset completion status
  const newBlocks = regenerateIds(originalWorkout.blocks);

  const duplicatedWorkout = await Workout.create({
    userId: new mongoose.Types.ObjectId(userId),
    name: originalWorkout.name,
    date: targetDate,
    notes: originalWorkout.notes,
    blocks: newBlocks,
    lastModifiedTime: now,
  });

  return toWorkoutType(duplicatedWorkout);
};

/**
 * Get workouts by date range
 */
export const getWorkoutsByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<WorkoutType[]> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user ID', 400);
  }

  const workouts = await Workout.find({
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });

  return workouts.map((doc) => toWorkoutType(doc));
};

// ============================================
// Block Operations
// ============================================

/**
 * Add a new block to a workout
 */
export const addBlock = async (
  workoutId: string,
  blockData: Omit<WorkoutBlock, 'id'>
): Promise<WorkoutType> => {
  if (!mongoose.Types.ObjectId.isValid(workoutId)) {
    throw new AppError('Invalid workout ID', 400);
  }

  const workout = await Workout.findById(workoutId);

  if (!workout) {
    throw new AppError('Workout not found', 404);
  }

  const newBlock: WorkoutBlock = {
    id: randomUUID(),
    ...blockData,
    exercises: blockData.exercises?.map((exercise) => ({
      ...exercise,
      id: randomUUID(),
      sets: exercise.sets?.map((set) => ({
        ...set,
        id: randomUUID(),
      })) || [],
    })) || [],
  };

  const now = new Date().toISOString();

  const updatedWorkout = await Workout.findByIdAndUpdate(
    workoutId,
    {
      $push: { blocks: newBlock },
      lastModifiedTime: now,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedWorkout) {
    throw new AppError('Workout not found', 404);
  }

  return toWorkoutType(updatedWorkout);
};

/**
 * Remove a block from a workout
 */
export const removeBlock = async (blockId: string): Promise<WorkoutType> => {
  // Find workout containing this block
  const workout = await Workout.findOne({ 'blocks.id': blockId });

  if (!workout) {
    throw new AppError('Block not found', 404);
  }

  const now = new Date().toISOString();

  const updatedWorkout = await Workout.findByIdAndUpdate(
    workout._id,
    {
      $pull: { blocks: { id: blockId } },
      lastModifiedTime: now,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedWorkout) {
    throw new AppError('Workout not found', 404);
  }

  return toWorkoutType(updatedWorkout);
};

/**
 * Reorder blocks within a workout
 */
export const reorderBlocks = async (
  workoutId: string,
  blockOrders: Array<{ blockId: string; order: number }>
): Promise<WorkoutType> => {
  if (!mongoose.Types.ObjectId.isValid(workoutId)) {
    throw new AppError('Invalid workout ID', 400);
  }

  const workout = await Workout.findById(workoutId);

  if (!workout) {
    throw new AppError('Workout not found', 404);
  }

  // Create a map of blockId to new order
  const orderMap = new Map(blockOrders.map((bo) => [bo.blockId, bo.order]));

  // Reorder blocks
  const reorderedBlocks = [...workout.blocks].sort((a, b) => {
    const orderA = orderMap.get(a.id) ?? Infinity;
    const orderB = orderMap.get(b.id) ?? Infinity;
    return orderA - orderB;
  });

  const now = new Date().toISOString();

  const updatedWorkout = await Workout.findByIdAndUpdate(
    workoutId,
    {
      blocks: reorderedBlocks,
      lastModifiedTime: now,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedWorkout) {
    throw new AppError('Workout not found', 404);
  }

  return toWorkoutType(updatedWorkout);
};

// ============================================
// Exercise Operations
// ============================================

/**
 * Add an exercise to a block
 */
export const addExercise = async (
  blockId: string,
  exerciseData: ExerciseInstanceInput
): Promise<WorkoutType> => {
  // Find workout containing this block
  const workout = await Workout.findOne({ 'blocks.id': blockId });

  if (!workout) {
    throw new AppError('Block not found', 404);
  }

  const newExercise: ExerciseInstance = {
    id: randomUUID(),
    ...exerciseData,
    sets: exerciseData.sets?.map((set) => ({
      ...set,
      id: randomUUID(),
    })) || [],
  };

  // Find the block and add the exercise
  const blockIndex = workout.blocks.findIndex((b) => b.id === blockId);
  if (blockIndex === -1) {
    throw new AppError('Block not found', 404);
  }

  workout.blocks[blockIndex].exercises.push(newExercise);
  workout.lastModifiedTime = new Date().toISOString();

  await workout.save();

  return toWorkoutType(workout);
};

/**
 * Remove an exercise from a block
 */
export const removeExercise = async (exerciseId: string): Promise<WorkoutType> => {
  // Find workout containing this exercise
  const workout = await Workout.findOne({ 'blocks.exercises.id': exerciseId });

  if (!workout) {
    throw new AppError('Exercise not found', 404);
  }

  // Find and remove the exercise
  for (const block of workout.blocks) {
    const exerciseIndex = block.exercises.findIndex((e) => e.id === exerciseId);
    if (exerciseIndex !== -1) {
      block.exercises.splice(exerciseIndex, 1);
      break;
    }
  }

  workout.lastModifiedTime = new Date().toISOString();
  await workout.save();

  return toWorkoutType(workout);
};

/**
 * Reorder exercises within a block
 */
export const reorderExercises = async (
  blockId: string,
  exerciseOrders: Array<{ exerciseId: string; orderInBlock: number }>
): Promise<WorkoutType> => {
  // Find workout containing this block
  const workout = await Workout.findOne({ 'blocks.id': blockId });

  if (!workout) {
    throw new AppError('Block not found', 404);
  }

  // Find the block
  const blockIndex = workout.blocks.findIndex((b) => b.id === blockId);
  if (blockIndex === -1) {
    throw new AppError('Block not found', 404);
  }

  // Update orderInBlock for each exercise
  const orderMap = new Map(exerciseOrders.map((eo) => [eo.exerciseId, eo.orderInBlock]));

  for (const exercise of workout.blocks[blockIndex].exercises) {
    const newOrder = orderMap.get(exercise.id);
    if (newOrder !== undefined) {
      exercise.orderInBlock = newOrder;
    }
  }

  // Sort exercises by orderInBlock
  workout.blocks[blockIndex].exercises.sort((a, b) => a.orderInBlock - b.orderInBlock);

  workout.lastModifiedTime = new Date().toISOString();
  await workout.save();

  return toWorkoutType(workout);
};

// ============================================
// Set Operations
// ============================================

/**
 * Update a set
 */
export const updateSet = async (
  setId: string,
  setData: Partial<import('../types').SetInstance>
): Promise<WorkoutType> => {
  // Find workout containing this set
  const workout = await Workout.findOne({ 'blocks.exercises.sets.id': setId });

  if (!workout) {
    throw new AppError('Set not found', 404);
  }

  // Find and update the set
  for (const block of workout.blocks) {
    for (const exercise of block.exercises) {
      const setIndex = exercise.sets.findIndex((s) => s.id === setId);
      if (setIndex !== -1) {
        // Update only the provided fields, keeping existing values for others
        const currentSet = exercise.sets[setIndex];
        if (setData.reps !== undefined) currentSet.reps = setData.reps;
        if (setData.weight !== undefined) currentSet.weight = setData.weight;
        if (setData.duration !== undefined) currentSet.duration = setData.duration;
        if (setData.rpe !== undefined) currentSet.rpe = setData.rpe;
        if (setData.notes !== undefined) currentSet.notes = setData.notes;
        if (setData.weightUnit !== undefined) currentSet.weightUnit = setData.weightUnit;

        workout.lastModifiedTime = new Date().toISOString();
        await workout.save();
        return toWorkoutType(workout);
      }
    }
  }

  throw new AppError('Set not found', 404);
};

/**
 * Complete a set
 */
export const completeSet = async (
  setId: string,
  completionData: {
    reps?: number;
    weight?: number;
    rpe?: number;
  }
): Promise<WorkoutType> => {
  // Find workout containing this set
  const workout = await Workout.findOne({ 'blocks.exercises.sets.id': setId });

  if (!workout) {
    throw new AppError('Set not found', 404);
  }

  const now = new Date().toISOString();

  // Find and complete the set
  for (const block of workout.blocks) {
    for (const exercise of block.exercises) {
      const setIndex = exercise.sets.findIndex((s) => s.id === setId);
      if (setIndex !== -1) {
        exercise.sets[setIndex] = {
          ...exercise.sets[setIndex],
          ...completionData,
        };
        workout.lastModifiedTime = now;
        await workout.save();
        return toWorkoutType(workout);
      }
    }
  }

  throw new AppError('Set not found', 404);
};
