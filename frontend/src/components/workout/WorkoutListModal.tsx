import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import type { WorkoutSummary } from '../../types/workout.types';
import { WorkoutCard } from './WorkoutCard';
import { colors, spacing, radius, typography } from '../../theme';

interface WorkoutListModalProps {
  visible: boolean;
  date: string; // ISO date string (YYYY-MM-DD)
  workouts: WorkoutSummary[];
  onClose: () => void;
  onSelectWorkout: (workoutId: string) => void;
}

/**
 * Modal that displays workouts for a selected date
 * Shows a list of workouts with the ability to select one
 */
export const WorkoutListModal: React.FC<WorkoutListModalProps> = ({
  visible,
  date,
  workouts,
  onClose,
  onSelectWorkout,
}) => {
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>Workouts</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.dateText}>{formatDate(date)}</Text>
          </View>

          {/* Workout List */}
          <ScrollView style={styles.scrollView}>
            {workouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No workouts</Text>
                <Text style={styles.emptyStateText}>
                  You haven't logged any workouts for this day yet.
                </Text>
              </View>
            ) : (
              workouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onPress={onSelectWorkout}
                  showDate={false}
                  showTime={true}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  closeButton: {
    width: spacing.xxxl,
    height: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: typography.sizes.xl,
    color: colors.textSecondary,
  },
  dateText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  scrollView: {
    paddingHorizontal: spacing.xl,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.huge,
  },
});
