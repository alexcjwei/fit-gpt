import { useMutation, useQueryClient } from '@tanstack/react-query';
import { duplicateWorkout, deleteWorkout } from '../api/workout.api';
import type { Workout } from '../types/workout.types';

/**
 * Hook for workout mutations (duplicate, delete)
 * Provides optimistic updates and cache invalidation
 */
export function useWorkoutMutations() {
  const queryClient = useQueryClient();

  const duplicate = useMutation({
    mutationFn: ({ id, newDate }: { id: string; newDate?: string }) =>
      duplicateWorkout(id, newDate),
    onSuccess: () => {
      // Invalidate all workout queries to refetch
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteWorkout(id),
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['workouts'] });

      // Snapshot the previous value
      const previousWorkouts = queryClient.getQueryData<Workout[]>([
        'workouts',
      ]);

      // Optimistically remove the workout from all workout queries
      queryClient.setQueriesData<Workout[]>(
        { queryKey: ['workouts'] },
        (old) => {
          if (!old) return old;
          return old.filter((workout) => workout.id !== id);
        }
      );

      // Return context with previous data for rollback
      return { previousWorkouts };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousWorkouts) {
        queryClient.setQueryData(['workouts'], context.previousWorkouts);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  return {
    duplicateWorkout: duplicate.mutateAsync,
    deleteWorkout: remove.mutateAsync,
    isDuplicating: duplicate.isPending,
    isDeleting: remove.isPending,
    duplicateError: duplicate.error,
    deleteError: remove.error,
  };
}
