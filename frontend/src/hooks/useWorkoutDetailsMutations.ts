import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateWorkout,
  updateSet,
  addBlock,
  deleteBlock,
  addExercise,
  deleteExercise,
} from '../api/workout.api';
import type { Workout, SetInstance } from '../types/workout.types';

/**
 * Hook for workout details mutations with optimistic updates
 * Provides mutations for updating workout metadata, sets, blocks, and exercises
 */
export function useWorkoutDetailsMutations(workoutId: string) {
  const queryClient = useQueryClient();

  // Helper to invalidate workout queries
  const invalidateWorkout = () => {
    queryClient.invalidateQueries({ queryKey: ['workouts', workoutId] });
    queryClient.invalidateQueries({ queryKey: ['workouts', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['workouts', 'calendar'] });
  };

  const updateWorkoutMutation = useMutation({
    mutationFn: (updates: Partial<Pick<Workout, 'name' | 'date' | 'notes'>>) =>
      updateWorkout(workoutId, updates),
    onMutate: async (updates) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['workouts', workoutId] });

      // Snapshot previous value
      const previousWorkout = queryClient.getQueryData<Workout>(['workouts', workoutId]);

      // Optimistically update
      if (previousWorkout) {
        queryClient.setQueryData<Workout>(['workouts', workoutId], {
          ...previousWorkout,
          ...updates,
          lastModifiedTime: new Date().toISOString(),
        });
      }

      return { previousWorkout };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousWorkout) {
        queryClient.setQueryData(['workouts', workoutId], context.previousWorkout);
      }
    },
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData(['workouts', workoutId], data);
      invalidateWorkout();
    },
  });

  const updateSetMutation = useMutation({
    mutationFn: ({
      setId,
      updates,
    }: {
      setId: string;
      updates: Partial<Pick<SetInstance, 'reps' | 'weight' | 'duration' | 'rpe' | 'notes'>>;
    }) => updateSet(setId, updates),
    onSuccess: (data) => {
      // Update cache with full workout response
      queryClient.setQueryData(['workouts', workoutId], data);
      invalidateWorkout();
    },
  });

  const addBlockMutation = useMutation({
    mutationFn: (block: { label?: string; notes?: string }) => addBlock(workoutId, block),
    onSuccess: (data) => {
      queryClient.setQueryData(['workouts', workoutId], data);
      invalidateWorkout();
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (blockId: string) => deleteBlock(blockId),
    onSuccess: (data) => {
      queryClient.setQueryData(['workouts', workoutId], data);
      invalidateWorkout();
    },
  });

  const addExerciseMutation = useMutation({
    mutationFn: ({
      blockId,
      exercise,
    }: {
      blockId: string;
      exercise: {
        exerciseId: string;
        orderInBlock: number;
        sets?: Array<{
          setNumber: number;
          weightUnit: 'lbs' | 'kg';
          targetRepsMin?: number;
          targetRepsMax?: number;
          targetWeight?: number;
          targetDuration?: number;
        }>;
      };
    }) => addExercise(blockId, exercise),
    onSuccess: (data) => {
      queryClient.setQueryData(['workouts', workoutId], data);
      invalidateWorkout();
    },
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (exerciseId: string) => deleteExercise(exerciseId),
    onSuccess: (data) => {
      queryClient.setQueryData(['workouts', workoutId], data);
      invalidateWorkout();
    },
  });

  return {
    updateWorkout: updateWorkoutMutation.mutateAsync,
    updateSet: updateSetMutation.mutateAsync,
    addBlock: addBlockMutation.mutateAsync,
    deleteBlock: deleteBlockMutation.mutateAsync,
    addExercise: addExerciseMutation.mutateAsync,
    deleteExercise: deleteExerciseMutation.mutateAsync,
    isUpdatingWorkout: updateWorkoutMutation.isPending,
    isUpdatingSet: updateSetMutation.isPending,
    isAddingBlock: addBlockMutation.isPending,
    isDeletingBlock: deleteBlockMutation.isPending,
    isAddingExercise: addExerciseMutation.isPending,
    isDeletingExercise: deleteExerciseMutation.isPending,
  };
}
