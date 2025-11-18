import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { SetInstance } from '../types/workout.types';
import { isSetCompleted } from '../types/workout.types';
import {
  validateSetInput,
  formatSetValue,
  parseSetValue,
  type SetField,
} from './EditableSetsList.utils';
import { colors, spacing, radius, typography } from '../theme';

// ============================================
// Component
// ============================================

interface EditableSetsListProps {
  sets: SetInstance[];
  onSetChange: (setId: string, updates: Partial<SetInstance>) => void;
}

export const EditableSetsList: React.FC<EditableSetsListProps> = ({ sets, onSetChange }) => {
  // Track local state for each input to allow validation before committing
  const [localValues, setLocalValues] = useState<
    Record<string, { reps: string; weight: string; duration: string }>
  >({});

  const getLocalValue = (setId: string, field: SetField): string => {
    return localValues[setId]?.[field] ?? '';
  };

  const handleInputChange = (set: SetInstance, field: SetField, value: string) => {
    // Validate input
    if (!validateSetInput(field, value)) {
      return; // Ignore invalid input
    }

    // Update local state
    setLocalValues((prev) => ({
      ...prev,
      [set.id]: {
        reps: field === 'reps' ? value : getLocalValue(set.id, 'reps'),
        weight: field === 'weight' ? value : getLocalValue(set.id, 'weight'),
        duration: field === 'duration' ? value : getLocalValue(set.id, 'duration'),
      },
    }));
  };

  const handleInputBlur = (setId: string, field: SetField) => {
    // Get the current local value and parse it
    const value = getLocalValue(setId, field);
    const parsedValue = parseSetValue(value);
    onSetChange(setId, { [field]: parsedValue });
  };

  // Initialize local values from props
  React.useEffect(() => {
    const initial: Record<string, { reps: string; weight: string; duration: string }> = {};
    sets.forEach((set) => {
      initial[set.id] = {
        reps: formatSetValue(set.reps),
        weight: formatSetValue(set.weight),
        duration: formatSetValue(set.duration),
      };
    });
    setLocalValues(initial);
  }, [sets]);

  return (
    <View style={styles.container}>
      {sets.map((set) => (
        <View key={set.id} style={[styles.setRow, isSetCompleted(set) && styles.setRowCompleted]}>
          <Text style={styles.setNumber}>Set {set.setNumber}</Text>

          <View style={styles.inputsContainer}>
            {/* Reps Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reps</Text>
              <TextInput
                style={styles.input}
                value={getLocalValue(set.id, 'reps')}
                onChangeText={(value) => handleInputChange(set, 'reps', value)}
                onBlur={() => handleInputBlur(set.id, 'reps')}
                keyboardType="number-pad"
                placeholder="-"
                placeholderTextColor="#999"
              />
            </View>

            {/* Weight Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight ({set.weightUnit})</Text>
              <TextInput
                style={styles.input}
                value={getLocalValue(set.id, 'weight')}
                onChangeText={(value) => handleInputChange(set, 'weight', value)}
                onBlur={() => handleInputBlur(set.id, 'weight')}
                keyboardType="decimal-pad"
                placeholder="-"
                placeholderTextColor="#999"
              />
            </View>

            {/* Duration Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (s)</Text>
              <TextInput
                style={styles.input}
                value={getLocalValue(set.id, 'duration')}
                onChangeText={(value) => handleInputChange(set, 'duration', value)}
                onBlur={() => handleInputBlur(set.id, 'duration')}
                keyboardType="number-pad"
                placeholder="-"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* RPE Display (read-only for now) */}
          {set.rpe !== undefined && <Text style={styles.rpeText}>RPE: {set.rpe}</Text>}
        </View>
      ))}
    </View>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  setRow: {
    backgroundColor: colors.backgroundGray,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  setRowCompleted: {
    backgroundColor: colors.success,
  },
  setNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xxs,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
    fontWeight: typography.weights.medium,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: typography.sizes.sm,
    color: colors.text,
    textAlign: 'center',
  },
  rpeText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});
