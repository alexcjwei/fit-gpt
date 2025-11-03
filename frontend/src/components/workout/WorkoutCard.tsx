import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { WorkoutSummary } from '../../types/workout.types';
import { formatWorkoutDateShort, isToday, isYesterday } from '../../utils/workoutFilters';

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
  showTime = true,
}) => {
  const formatTime = (timestamp?: string) => {
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
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(workout.id)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          {showDate && (
            <Text style={styles.dateLabel}>{getDateLabel(workout.date)}</Text>
          )}
        </View>
        {showTime && workout.startTime && (
          <Text style={styles.workoutTime}>{formatTime(workout.startTime)}</Text>
        )}
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
  },
  workoutTime: {
    fontSize: 14,
    color: '#666',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 12,
  },
});
