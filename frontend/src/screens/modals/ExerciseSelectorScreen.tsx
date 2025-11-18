import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../types/navigation.types';
import { colors, spacing, radius, typography } from '../../theme';

type ExerciseSelectorRouteProp = RouteProp<RootStackParamList, 'ExerciseSelector'>;
type ExerciseSelectorNavigationProp = StackNavigationProp<RootStackParamList, 'ExerciseSelector'>;

// MVP: Hardcoded exercise list
// TODO: Replace with actual exercise library API
const MOCK_EXERCISES = [
  {
    id: '507f1f77bcf86cd799439011',
    name: 'Barbell Bench Press',
    category: 'chest',
    equipment: 'barbell',
  },
];

export const ExerciseSelectorScreen: React.FC = () => {
  const navigation = useNavigation<ExerciseSelectorNavigationProp>();
  const route = useRoute<ExerciseSelectorRouteProp>();
  const { blockId } = route.params;

  const handleSelectExercise = (exerciseId: string, exerciseName: string) => {
    // TODO: Implement actual exercise addition using useWorkoutDetailsMutations
    // For MVP, just show an alert
    Alert.alert(
      'Exercise Selected',
      `You selected "${exerciseName}" for block ${blockId}.\n\nExercise addition will be implemented in the next phase.`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Exercise</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          📝 MVP: Only "Barbell Bench Press" available for now. Full exercise library coming soon!
        </Text>
      </View>

      {/* Exercise List */}
      <FlatList
        data={MOCK_EXERCISES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.exerciseItem}
            onPress={() => handleSelectExercise(item.id, item.name)}
          >
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <Text style={styles.exerciseMeta}>
                {item.category} • {item.equipment}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
  cancelText: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  infoBanner: {
    backgroundColor: '#E3F2FD',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: '#1976D2',
    lineHeight: spacing.xl,
  },
  listContent: {
    padding: spacing.lg,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundGray,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  exerciseMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: typography.sizes.xl,
    color: colors.borderMuted,
    marginLeft: spacing.md,
  },
});
