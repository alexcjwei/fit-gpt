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
import type { RouteProp } from '@react-navigation/native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import type {
  CalendarStackParamList,
  WorkoutsStackParamList,
  RootStackParamList,
} from '../types/navigation.types';
import { getWorkout } from '../api/workout.api';
import { useWorkoutDetailsMutations } from '../hooks/useWorkoutDetailsMutations';
import type { WorkoutBlock, ExerciseInstance, SetInstance } from '../types/workout.types';
import { isSetCompleted } from '../types/workout.types';
import { EditableSetsList } from '../components/EditableSetsList';
import { colors, spacing, radius, typography } from '../theme';

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
    addExercise: _addExercise,
    deleteExercise: _deleteExercise,
    isAddingBlock,
    isDeletingBlock: _isDeletingBlock,
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
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update workout');
    }
  };

  const handleAddBlock = async () => {
    try {
      const blockNumber = workout ? workout.blocks.length + 1 : 1;
      await addBlock({ label: `Block ${blockNumber}` });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add block');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    Alert.alert('Delete Block', 'Are you sure you want to delete this block?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteBlock(blockId);
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete block'
              );
            }
          })();
        },
      },
    ]);
  };

  const handleSetChange = async (setId: string, updates: Partial<SetInstance>) => {
    try {
      await updateSet({ setId, updates });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update set');
    }
  };

  const handleOpenExerciseSelector = (blockId: string) => {
    navigation.navigate('ExerciseSelector', { blockId });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
      {/* Compact Header */}
      <View style={styles.header}>
        {isEditMode ? (
          <>
            <View style={styles.headerEditContent}>
              <TextInput
                style={styles.titleInput}
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Workout name"
                placeholderTextColor={colors.placeholder}
              />
              <TextInput
                style={styles.dateInput}
                value={editingDate}
                onChangeText={setEditingDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <TouchableOpacity
              onPress={() => {
                void handleSaveWorkoutMetadata();
              }}
            >
              <Text style={styles.editButtonText}>Done</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{workout.name}</Text>
              <View style={styles.dateBadge}>
                <Text style={styles.dateText}>{workout.date}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                setIsEditMode(true);
              }}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
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
              onSetChange={handleSetChange}
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
            <ActivityIndicator size="small" color={colors.white} />
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
  onSetChange: (setId: string, updates: Partial<SetInstance>) => void;
}

const BlockCard: React.FC<BlockCardProps> = ({
  block,
  blockNumber,
  isEditMode,
  onDelete,
  onAddExercise,
  onSetChange,
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
            <ExerciseCard key={exercise.id} exercise={exercise} onSetChange={onSetChange} />
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
  onSetChange: (setId: string, updates: Partial<SetInstance>) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onSetChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const completedSets = exercise.sets.filter((set) => isSetCompleted(set)).length;
  const totalSets = exercise.sets.length;

  return (
    <View style={styles.exerciseCard}>
      <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseHeaderLeft}>
            <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
            {exercise.prescription && (
              <Text style={styles.exercisePrescription}>{exercise.prescription}</Text>
            )}
            <Text style={styles.setSummary}>
              {completedSets} / {totalSets} sets completed
            </Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </View>
      </TouchableOpacity>

      {/* Expandable Sets List */}
      {isExpanded && (
        <View style={styles.setsContainer}>
          <EditableSetsList sets={exercise.sets} onSetChange={onSetChange} />
        </View>
      )}
    </View>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.md,
  },
  headerEditContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  editButtonText: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  dateBadge: {
    backgroundColor: colors.backgroundGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.xs,
  },
  dateText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  titleInput: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: spacing.xxs,
    marginBottom: spacing.sm,
  },
  dateInput: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: spacing.xxs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: typography.sizes.md,
    color: colors.placeholder,
    textAlign: 'center',
  },
  blockCard: {
    backgroundColor: colors.backgroundGray,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  blockLabel: {
    fontSize: 18,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  deleteText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    fontWeight: typography.weights.semibold,
  },
  blockNotes: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  emptyExercises: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyExercisesText: {
    fontSize: typography.sizes.sm,
    color: colors.placeholder,
    marginBottom: spacing.md,
  },
  addExerciseButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  addExerciseButtonFilled: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  addExerciseButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  exerciseCard: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseHeaderLeft: {
    flex: 1,
  },
  exerciseName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  exercisePrescription: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: spacing.xxs,
  },
  setSummary: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  expandIcon: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    marginLeft: spacing.md,
  },
  setsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#a0c4ff',
  },
  addButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});
