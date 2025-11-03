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
