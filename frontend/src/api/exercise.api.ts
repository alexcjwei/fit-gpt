import apiClient from './client';
import type {
  ExercisesResponse,
  ExerciseSearchResult,
  SearchExercisesResponse,
  ApiResponse,
} from '../types/workout.types';

/**
 * Get exercises with optional filtering and pagination
 * @param params Query parameters for filtering exercises
 */
export const getExercises = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ExercisesResponse> => {
  const response = await apiClient.get<ApiResponse<ExercisesResponse>>('/exercises', {
    params: params || {},
  });

  if (!response.data.data) {
    throw new Error('Failed to fetch exercises');
  }

  return response.data.data;
};

/**
 * Fuzzy search exercises by name
 * @param query Search query for exercise name
 * @param limit Maximum number of results to return (default: 5)
 */
export const searchExercises = async (
  query: string,
  limit: number = 5
): Promise<ExerciseSearchResult[]> => {
  const response = await apiClient.get<SearchExercisesResponse>('/exercises/search', {
    params: { q: query, limit },
  });

  return response.data.data?.results || [];
};
