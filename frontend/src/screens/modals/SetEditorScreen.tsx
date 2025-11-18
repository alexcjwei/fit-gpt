import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import type { RootStackParamList } from '../../types/navigation.types';
import { getWorkouts } from '../../api/workout.api';
import { useWorkoutDetailsMutations } from '../../hooks/useWorkoutDetailsMutations';
import type { SetInstance } from '../../types/workout.types';
import { colors, spacing, radius, typography } from '../../theme';

type SetEditorRouteProp = RouteProp<RootStackParamList, 'SetEditor'>;
type SetEditorNavigationProp = StackNavigationProp<RootStackParamList, 'SetEditor'>;

export const SetEditorScreen: React.FC = () => {
  const navigation = useNavigation<SetEditorNavigationProp>();
  const route = useRoute<SetEditorRouteProp>();
  const { setId } = route.params;

  const [set, setSet] = useState<SetInstance | null>(null);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [duration, setDuration] = useState('');
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all workouts to find the set (optimized: could be improved with a dedicated endpoint)
  const { data: workouts, isLoading } = useQuery({
    queryKey: ['workouts', 'list'],
    queryFn: () => getWorkouts({}),
  });

  // Find the set and workout
  useEffect(() => {
    if (workouts && workouts.length > 0) {
      for (const workout of workouts) {
        for (const block of workout.blocks) {
          for (const exercise of block.exercises) {
            const foundSet = exercise.sets.find((s) => s.id === setId);
            if (foundSet) {
              setSet(foundSet);
              setWorkoutId(workout.id);
              // Initialize form fields
              setWeight(foundSet.weight?.toString() || '');
              setReps(foundSet.reps?.toString() || '');
              setDuration(foundSet.duration?.toString() || '');
              setRpe(foundSet.rpe?.toString() || '');
              setNotes(foundSet.notes || '');
              return;
            }
          }
        }
      }
    }
  }, [workouts, setId]);

  // Always call hook (React rules), but only use it when workoutId is available
  const mutations = useWorkoutDetailsMutations(workoutId || '');

  // Debounced save function
  const debouncedSave = () => {
    if (!workoutId || !mutations || !hasChanges) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const updates: Partial<SetInstance> = {};
          if (weight) updates.weight = parseFloat(weight);
          if (reps) updates.reps = parseInt(reps, 10);
          if (duration) updates.duration = parseInt(duration, 10);
          if (rpe) updates.rpe = parseFloat(rpe);
          if (notes) updates.notes = notes;

          await mutations.updateSet({ setId, updates });
          setHasChanges(false);
        } catch (error) {
          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save set');
        }
      })();
    }, 500); // 500ms debounce
  };

  // Trigger debounced save when fields change
  useEffect(() => {
    if (hasChanges) {
      debouncedSave();
    }

    // Cleanup timer on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [weight, reps, duration, rpe, notes, hasChanges]);

  const handleFieldChange = (field: string, value: string) => {
    setHasChanges(true);
    switch (field) {
      case 'weight':
        setWeight(value);
        break;
      case 'reps':
        setReps(value);
        break;
      case 'duration':
        setDuration(value);
        break;
      case 'rpe':
        setRpe(value);
        break;
      case 'notes':
        setNotes(value);
        break;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading set...</Text>
      </View>
    );
  }

  if (!set) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Set not found</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Edit Set {set.setNumber}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Weight */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Weight ({set.weightUnit})</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={(value) => handleFieldChange('weight', value)}
            keyboardType="decimal-pad"
            placeholder="Enter weight"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        {/* Reps */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Reps</Text>
          <TextInput
            style={styles.input}
            value={reps}
            onChangeText={(value) => handleFieldChange('reps', value)}
            keyboardType="number-pad"
            placeholder="Enter reps"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        {/* Duration */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Duration (seconds)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={(value) => handleFieldChange('duration', value)}
            keyboardType="number-pad"
            placeholder="Enter duration"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        {/* RPE */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>RPE (Rate of Perceived Exertion)</Text>
          <Text style={styles.helpText}>1-10 scale (optional)</Text>
          <TextInput
            style={styles.input}
            value={rpe}
            onChangeText={(value) => handleFieldChange('rpe', value)}
            keyboardType="decimal-pad"
            placeholder="Enter RPE"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        {/* Notes */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={(value) => handleFieldChange('notes', value)}
            placeholder="Enter notes (optional)"
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Auto-save indicator */}
        {hasChanges && mutations?.isUpdatingSet && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}
        {!hasChanges && !mutations?.isUpdatingSet && (weight || reps || duration) && (
          <View style={styles.savedIndicator}>
            <Text style={styles.savedText}>✓ Saved</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

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
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  doneText: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.xxl,
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  helpText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: colors.white,
  },
  notesInput: {
    height: 100,
    paddingTop: 10,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.sm,
  },
  closeButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  savingText: {
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.primary,
  },
  savedIndicator: {
    alignItems: 'center',
    padding: spacing.md,
  },
  savedText: {
    fontSize: typography.sizes.sm,
    color: '#34C759',
    fontWeight: typography.weights.semibold,
  },
});
