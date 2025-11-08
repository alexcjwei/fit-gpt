import apiClient from './client';
import type {
  Workout,
  CalendarWorkoutsResponse,
  WorkoutResponse,
  CreateWorkoutResponse,
  DuplicateWorkoutResponse,
  DuplicateWorkoutRequest,
  DeleteWorkoutResponse,
  PaginatedResponse,
} from '../types/workout.types';

/**
 * Get workouts by date range for calendar view
 * @param startDate ISO date string (YYYY-MM-DD)
 * @param endDate ISO date string (YYYY-MM-DD)
 */
export const getWorkoutsCalendar = async (
  startDate: string,
  endDate: string
): Promise<Workout[]> => {
  const response = await apiClient.get<CalendarWorkoutsResponse>(
    '/workouts/calendar',
    {
      params: { startDate, endDate },
    }
  );
  return response.data.data || [];
};

/**
 * Get a single workout by ID
 * @param id Workout ID (UUID)
 */
export const getWorkout = async (id: string): Promise<Workout> => {
  const response = await apiClient.get<WorkoutResponse>(`/workouts/${id}`);
  if (!response.data.data) {
    throw new Error('Workout not found');
  }
  return response.data.data;
};

/**
 * Create a new workout
 * @param workout Workout object
 */
export const createWorkout = async (workout: Workout): Promise<Workout> => {
  const response = await apiClient.post<CreateWorkoutResponse>('/workouts', workout);
  if (!response.data.data) {
    throw new Error('Failed to create workout');
  }
  return response.data.data;
};

/**
 * Duplicate an existing workout
 * @param id Workout ID to duplicate
 * @param newDate Optional new date for the duplicated workout (defaults to today)
 */
export const duplicateWorkout = async (
  id: string,
  newDate?: string
): Promise<Workout> => {
  const requestBody: DuplicateWorkoutRequest = newDate ? { newDate } : {};
  const response = await apiClient.post<DuplicateWorkoutResponse>(
    `/workouts/${id}/duplicate`,
    requestBody
  );
  if (!response.data.data) {
    throw new Error('Failed to duplicate workout');
  }
  return response.data.data;
};

/**
 * Get workouts with optional filtering and pagination
 * @param params Query parameters for filtering workouts
 */
export const getWorkouts = async (params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<Workout[]> => {
  const response = await apiClient.get<PaginatedResponse<Workout>>('/workouts', {
    params,
  });
  return response.data.data?.workouts || [];
};

/**
 * Delete a workout by ID
 * @param id Workout ID to delete
 */
export const deleteWorkout = async (id: string): Promise<void> => {
  const response = await apiClient.delete<DeleteWorkoutResponse>(
    `/workouts/${id}`
  );
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to delete workout');
  }
};

/**
 * Update workout metadata (name, date, notes, etc.)
 * @param id Workout ID
 * @param updates Partial workout updates
 */
export const updateWorkout = async (
  id: string,
  updates: Partial<Pick<Workout, 'name' | 'date' | 'notes'>>
): Promise<Workout> => {
  const response = await apiClient.put<WorkoutResponse>(`/workouts/${id}`, {
    ...updates,
    lastModifiedTime: new Date().toISOString(),
  });
  if (!response.data.data) {
    throw new Error('Failed to update workout');
  }
  return response.data.data;
};

/**
 * Update a set's data (weight, reps, duration, RPE, etc.)
 * @param setId Set ID
 * @param updates Set data updates
 */
export const updateSet = async (
  setId: string,
  updates: {
    reps?: number;
    weight?: number;
    duration?: number;
    rpe?: number;
    notes?: string;
  }
): Promise<Workout> => {
  const response = await apiClient.put<WorkoutResponse>(`/workouts/sets/${setId}`, updates);
  if (!response.data.data) {
    throw new Error('Failed to update set');
  }
  return response.data.data;
};

/**
 * Add a new block to a workout
 * @param workoutId Workout ID
 * @param block Block data
 */
export const addBlock = async (
  workoutId: string,
  block: {
    label?: string;
    notes?: string;
  }
): Promise<Workout> => {
  const response = await apiClient.post<WorkoutResponse>(`/workouts/${workoutId}/blocks`, block);
  if (!response.data.data) {
    throw new Error('Failed to add block');
  }
  return response.data.data;
};

/**
 * Delete a block from a workout
 * @param blockId Block ID to delete
 */
export const deleteBlock = async (blockId: string): Promise<Workout> => {
  const response = await apiClient.delete<WorkoutResponse>(`/workouts/blocks/${blockId}`);
  if (!response.data.data) {
    throw new Error('Failed to delete block');
  }
  return response.data.data;
};

/**
 * Add an exercise to a block
 * @param blockId Block ID
 * @param exercise Exercise data
 */
export const addExercise = async (
  blockId: string,
  exercise: {
    exerciseId: string;
    orderInBlock: number;
    sets?: Array<{
      setNumber: number;
      weightUnit: 'lbs' | 'kg';
      reps?: number;
      weight?: number;
      duration?: number;
    }>;
  }
): Promise<Workout> => {
  const response = await apiClient.post<WorkoutResponse>(`/workouts/blocks/${blockId}/exercises`, exercise);
  if (!response.data.data) {
    throw new Error('Failed to add exercise');
  }
  return response.data.data;
};

/**
 * Delete an exercise from a block
 * @param exerciseId Exercise instance ID to delete
 */
export const deleteExercise = async (exerciseId: string): Promise<Workout> => {
  const response = await apiClient.delete<WorkoutResponse>(`/workouts/exercises/${exerciseId}`);
  if (!response.data.data) {
    throw new Error('Failed to delete exercise');
  }
  return response.data.data;
};

/**
 * Parse workout text and save to database
 * @param text Unstructured workout text to parse
 */
export const parseWorkout = async (text: string): Promise<Workout> => {
  const response = await apiClient.post<WorkoutResponse>(
    '/workouts/parse',
    { text },
    { timeout: 60000 }
  );
  if (!response.data.data) {
    throw new Error('Failed to parse workout');
  }
  return response.data.data;
};
