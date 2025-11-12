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

interface WorkoutListModalProps {
  visible: boolean;
  date: string; // ISO date string (YYYY-MM-DD)
  workouts: WorkoutSummary[];
  onClose: () => void;
  onSelectWorkout: (workoutId: string) => void;
  onCreateWorkout: () => void;
}

/**
 * Modal that displays workouts for a selected date
 * Shows a list of workouts with the ability to select one or create new
 */
export const WorkoutListModal: React.FC<WorkoutListModalProps> = ({
  visible,
  date,
  workouts,
  onClose,
  onSelectWorkout,
  onCreateWorkout,
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

          {/* Create Workout Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.createButton} onPress={onCreateWorkout}>
              <Text style={styles.createButtonText}>+ Create Workout</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
