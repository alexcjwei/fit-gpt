import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../types/navigation.types';
import { colors, spacing, radius, typography } from '../../theme';

type WorkoutEditorRouteProp = RouteProp<RootStackParamList, 'WorkoutEditor'>;
type WorkoutEditorNavigationProp = StackNavigationProp<RootStackParamList, 'WorkoutEditor'>;

export const WorkoutEditorScreen: React.FC = () => {
  const navigation = useNavigation<WorkoutEditorNavigationProp>();
  const route = useRoute<WorkoutEditorRouteProp>();

  const { mode, workoutId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workout Editor</Text>
      <Text style={styles.subtitle}>
        Mode: {mode} {workoutId ? `(ID: ${workoutId})` : ''}
      </Text>
      <Text style={styles.description}>Create or edit workout details, blocks, and exercises</Text>

      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeButtonText}>Close Modal</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.placeholder,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
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
});
