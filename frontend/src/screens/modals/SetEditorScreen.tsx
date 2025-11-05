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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { RootStackParamList } from '../../types/navigation.types';
import { getWorkouts } from '../../api/workout.api';
import { useWorkoutDetailsMutations } from '../../hooks/useWorkoutDetailsMutations';
import type { SetInstance, Workout } from '../../types/workout.types';

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

  const mutations = workoutId ? useWorkoutDetailsMutations(workoutId) : null;

  // Debounced save function
  const debouncedSave = () => {
    if (!workoutId || !mutations || !hasChanges) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const updates: any = {};
        if (weight) updates.weight = parseFloat(weight);
        if (reps) updates.reps = parseInt(reps, 10);
        if (duration) updates.duration = parseInt(duration, 10);
        if (rpe) updates.rpe = parseFloat(rpe);
        if (notes) updates.notes = notes;

        await mutations.updateSet({ setId, updates });
        setHasChanges(false);
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to save set'
        );
      }
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
        <ActivityIndicator size="large" color="#007AFF" />
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
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Auto-save indicator */}
        {hasChanges && mutations?.isUpdatingSet && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
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
    marginBottom: 20,
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  doneText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  notesInput: {
    height: 100,
    paddingTop: 10,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
  },
  savedIndicator: {
    alignItems: 'center',
    padding: 12,
  },
  savedText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
});
