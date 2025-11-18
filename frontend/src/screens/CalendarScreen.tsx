import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { DateData } from 'react-native-calendars';
import { Calendar } from 'react-native-calendars';
import { useQuery } from '@tanstack/react-query';
import type { CalendarStackParamList, RootStackParamList } from '../types/navigation.types';
import { getWorkoutsCalendar } from '../api/workout.api';
import { WorkoutListModal } from '../components/workout/WorkoutListModal';
import type { WorkoutSummary } from '../types/workout.types';

type CalendarScreenNavigationProp = StackNavigationProp<CalendarStackParamList, 'CalendarScreen'>;
type RootNavigationProp = StackNavigationProp<RootStackParamList>;

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const rootNavigation = useNavigation<RootNavigationProp>();

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);

  // Calculate date range for current month ± 1 month
  const dateRange = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, []);

  // Fetch workouts for the date range
  const {
    data: workouts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workouts', 'calendar', dateRange.startDate, dateRange.endDate],
    queryFn: () => getWorkoutsCalendar(dateRange.startDate, dateRange.endDate),
  });

  // Group workouts by date
  const workoutsByDate = useMemo(() => {
    const grouped: { [date: string]: WorkoutSummary[] } = {};

    workouts.forEach((workout) => {
      const date = workout.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push({
        id: workout.id,
        name: workout.name,
        date: workout.date,
      });
    });

    return grouped;
  }, [workouts]);

  // Create marked dates for calendar with workout counts
  const markedDates = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const marked: Record<string, any> = {};

    Object.keys(workoutsByDate).forEach((date) => {
      const workoutCount = workoutsByDate[date].length;
      marked[date] = {
        marked: true,
        dotColor: '#007AFF',
        customStyles: {
          container: {
            backgroundColor: workoutCount > 0 ? '#E3F2FD' : 'transparent',
            borderRadius: 16,
          },
          text: {
            color: '#333',
            fontWeight: workoutCount > 0 ? '600' : '400',
          },
        },
      };
    });

    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#007AFF',
        customStyles: {
          container: {
            backgroundColor: '#007AFF',
            borderRadius: 16,
          },
          text: {
            color: '#fff',
            fontWeight: '600',
          },
        },
      };
    }

    return marked;
  }, [workoutsByDate, selectedDate]);

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  const handleSelectWorkout = (workoutId: string) => {
    setModalVisible(false);
    navigation.navigate('WorkoutDetailsScreen', { workoutId });
  };

  const handleCreateWorkout = () => {
    setModalVisible(false);
    rootNavigation.navigate('WorkoutEditor', {
      mode: 'create',
      date: selectedDate,
    });
  };

  const handleCreateWorkoutFAB = () => {
    const today = new Date().toISOString().split('T')[0];
    rootNavigation.navigate('WorkoutEditor', {
      mode: 'create',
      date: today,
    });
  };

  // Get workouts for selected date
  const selectedDateWorkouts = useMemo(() => {
    return workoutsByDate[selectedDate] || [];
  }, [selectedDate, workoutsByDate]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Failed to load workouts</Text>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        markingType="custom"
        theme={{
          todayTextColor: '#007AFF',
          selectedDayBackgroundColor: '#007AFF',
          selectedDayTextColor: '#fff',
          dotColor: '#007AFF',
          arrowColor: '#007AFF',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textMonthFontWeight: '600',
        }}
        enableSwipeMonths={true}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateWorkoutFAB}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Workout List Modal */}
      <WorkoutListModal
        visible={modalVisible}
        date={selectedDate}
        workouts={selectedDateWorkouts}
        onClose={() => setModalVisible(false)}
        onSelectWorkout={handleSelectWorkout}
        onCreateWorkout={handleCreateWorkout}
      />
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
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
});
