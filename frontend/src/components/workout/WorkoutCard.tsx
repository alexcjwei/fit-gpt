import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { WorkoutSummary } from '../../types/workout.types';
import { formatWorkoutDateShort, isToday, isYesterday } from '../../utils/workoutFilters';
import { colors, spacing, radius, typography } from '../../theme';

interface WorkoutCardProps {
  workout: WorkoutSummary;
  onPress: (workoutId: string) => void;
  showDate?: boolean;
  showTime?: boolean;
}

/**
 * Reusable workout card component
 * Displays workout summary with optional date and time
 */
export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  workout,
  onPress,
  showDate = false,
  showTime: _showTime = true,
}) => {
  const _formatTime = (timestamp?: string) => {
    if (!timestamp) return null;
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDateLabel = (date: string) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return formatWorkoutDateShort(date);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(workout.id)} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          {showDate && <Text style={styles.dateLabel}>{getDateLabel(workout.date)}</Text>}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundGray,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginVertical: spacing.xs,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxs,
  },
  workoutName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    flex: 1,
  },
  dateLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  chevron: {
    fontSize: typography.sizes.xl,
    color: colors.borderMuted,
    marginLeft: spacing.md,
  },
});
