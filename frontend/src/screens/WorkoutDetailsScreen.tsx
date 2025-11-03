import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarStackParamList,
  WorkoutsStackParamList,
  RootStackParamList,
} from '../types/navigation.types';
import { getWorkout } from '../api/workout.api';
import { useWorkoutDetailsMutations } from '../hooks/useWorkoutDetailsMutations';
import type { Workout, WorkoutBlock, ExerciseInstance, SetInstance } from '../types/workout.types';
import { isSetCompleted } from '../types/workout.types';

type WorkoutDetailsScreenRouteProp =
  | RouteProp<CalendarStackParamList, 'WorkoutDetailsScreen'>
  | RouteProp<WorkoutsStackParamList, 'WorkoutDetailsScreen'>;

type RootNavigationProp = StackNavigationProp<RootStackParamList>;

export const WorkoutDetailsScreen: React.FC = () => {
  const route = useRoute<WorkoutDetailsScreenRouteProp>();
  const navigation = useNavigation<RootNavigationProp>();
  const { workoutId } = route.params;

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingDate, setEditingDate] = useState('');

  // Fetch workout data
  const {
    data: workout,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['workouts', workoutId],
    queryFn: () => getWorkout(workoutId),
  });

  // Get mutations
  const {
    updateWorkout,
    updateSet,
    addBlock,
    deleteBlock,
    addExercise,
    deleteExercise,
    isAddingBlock,
    isDeletingBlock,
  } = useWorkoutDetailsMutations(workoutId);

  // Initialize editing fields when workout loads
  React.useEffect(() => {
    if (workout && !editingName) {
      setEditingName(workout.name);
      setEditingDate(workout.date);
    }
  }, [workout]);

  const handleSaveWorkoutMetadata = async () => {
    if (!workout) return;

    try {
      await updateWorkout({
        name: editingName,
        date: editingDate,
      });
      setIsEditMode(false);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update workout'
      );
    }
  };

  const handleAddBlock = async () => {
    try {
      const blockNumber = workout ? workout.blocks.length + 1 : 1;
      await addBlock({ label: `Block ${blockNumber}` });
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to add block'
      );
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    Alert.alert('Delete Block', 'Are you sure you want to delete this block?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBlock(blockId);
          } catch (error) {
            Alert.alert(
              'Error',
              error instanceof Error ? error.message : 'Failed to delete block'
            );
          }
        },
      },
    ]);
  };

  const handleOpenSetEditor = (setId: string) => {
    navigation.navigate('SetEditor', { setId });
  };

  const handleOpenExerciseSelector = (blockId: string) => {
    navigation.navigate('ExerciseSelector', { blockId });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    );
  }

  if (error || !workout) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Failed to load workout</Text>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (isEditMode) {
              handleSaveWorkoutMetadata();
            } else {
              setIsEditMode(true);
            }
          }}
        >
          <Text style={styles.editButtonText}>{isEditMode ? 'Done' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {/* Workout Name and Date */}
      <View style={styles.titleContainer}>
        {isEditMode ? (
          <>
            <TextInput
              style={styles.titleInput}
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Workout name"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.dateInput}
              value={editingDate}
              onChangeText={setEditingDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>{workout.name}</Text>
            <Text style={styles.date}>{workout.date}</Text>
          </>
        )}
      </View>

      {/* Blocks List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {workout.blocks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No blocks yet. Tap "Add Block" to get started.
            </Text>
          </View>
        ) : (
          workout.blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              blockNumber={index + 1}
              isEditMode={isEditMode}
              onDelete={() => handleDeleteBlock(block.id)}
              onAddExercise={() => handleOpenExerciseSelector(block.id)}
              onSetPress={handleOpenSetEditor}
            />
          ))
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.addButton, isAddingBlock && styles.addButtonDisabled]}
          onPress={handleAddBlock}
          disabled={isAddingBlock}
        >
          {isAddingBlock ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>+ Add Block</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================
// BlockCard Component
// ============================================

interface BlockCardProps {
  block: WorkoutBlock;
  blockNumber: number;
  isEditMode: boolean;
  onDelete: () => void;
  onAddExercise: () => void;
  onSetPress: (setId: string) => void;
}

const BlockCard: React.FC<BlockCardProps> = ({
  block,
  blockNumber,
  isEditMode,
  onDelete,
  onAddExercise,
  onSetPress,
}) => {
  return (
    <View style={styles.blockCard}>
      {/* Block Header */}
      <View style={styles.blockHeader}>
        <Text style={styles.blockLabel}>{block.label || `Block ${blockNumber}`}</Text>
        {isEditMode && (
          <TouchableOpacity onPress={onDelete}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Block Notes */}
      {block.notes && <Text style={styles.blockNotes}>{block.notes}</Text>}

      {/* Exercises */}
      {block.exercises.length === 0 ? (
        <View style={styles.emptyExercises}>
          <Text style={styles.emptyExercisesText}>No exercises</Text>
          <TouchableOpacity onPress={onAddExercise} style={styles.addExerciseButton}>
            <Text style={styles.addExerciseButtonText}>+ Add Exercise</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {block.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onSetPress={onSetPress}
            />
          ))}
          <TouchableOpacity onPress={onAddExercise} style={styles.addExerciseButtonFilled}>
            <Text style={styles.addExerciseButtonText}>+ Add Exercise</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

// ============================================
// ExerciseCard Component
// ============================================

interface ExerciseCardProps {
  exercise: ExerciseInstance;
  onSetPress: (setId: string) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onSetPress }) => {
  // TODO: Fetch exercise details from exercise library
  // For now, just display exerciseId
  const exerciseName = `Exercise ${exercise.exerciseId.substring(0, 8)}...`;

  const completedSets = exercise.sets.filter((set) => isSetCompleted(set)).length;
  const totalSets = exercise.sets.length;

  return (
    <View style={styles.exerciseCard}>
      <Text style={styles.exerciseName}>{exerciseName}</Text>
      <Text style={styles.setSummary}>
        {completedSets} / {totalSets} sets completed
      </Text>

      {/* Sets List */}
      {exercise.sets.map((set) => (
        <TouchableOpacity
          key={set.id}
          style={[
            styles.setRow,
            isSetCompleted(set) && styles.setRowCompleted,
          ]}
          onPress={() => onSetPress(set.id)}
        >
          <Text style={styles.setNumber}>Set {set.setNumber}</Text>
          <View style={styles.setDetails}>
            {set.targetWeight !== undefined && (
              <Text style={styles.setDetailText}>
                {set.actualWeight ?? set.targetWeight} {set.weightUnit}
              </Text>
            )}
            {set.targetRepsMin !== undefined && (
              <Text style={styles.setDetailText}>
                {set.actualReps ?? `${set.targetRepsMin}-${set.targetRepsMax}`} reps
              </Text>
            )}
            {set.targetDuration !== undefined && (
              <Text style={styles.setDetailText}>
                {set.actualDuration ?? set.targetDuration}s
              </Text>
            )}
            {set.rpe && (
              <Text style={styles.setDetailText}>RPE: {set.rpe}</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '500',
  },
  editButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#666',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    paddingVertical: 4,
    marginBottom: 12,
  },
  dateInput: {
    fontSize: 16,
    color: '#666',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    paddingVertical: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  blockCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  deleteText: {
    fontSize: 14,
    color: '#ff3b30',
    fontWeight: '600',
  },
  blockNotes: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  emptyExercises: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyExercisesText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  addExerciseButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addExerciseButtonFilled: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  addExerciseButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  setSummary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 6,
  },
  setRowCompleted: {
    backgroundColor: '#e3f2fd',
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 60,
  },
  setDetails: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  setDetailText: {
    fontSize: 14,
    color: '#666',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#a0c4ff',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
