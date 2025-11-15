import { useQuery } from '@tanstack/react-query';
import { getExercises } from '../api/exercise.api';

/**
 * Hook for fetching exercises with pagination and search
 * @param search Optional search query
 * @param page Page number (default: 1)
 * @param limit Number of exercises per page (default: 20)
 */
export function useExercises(params?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['exercises', params],
    queryFn: () => getExercises(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
