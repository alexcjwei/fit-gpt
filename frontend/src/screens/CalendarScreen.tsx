import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { DateData } from 'react-native-calendars';
import { Calendar } from 'react-native-calendars';
import { useQuery } from '@tanstack/react-query';
import type { CalendarStackParamList } from '../types/navigation.types';
import { getWorkoutsCalendar } from '../api/workout.api';
import { WorkoutListModal } from '../components/workout/WorkoutListModal';
import type { WorkoutSummary } from '../types/workout.types';
import { colors, spacing, typography } from '../theme';

type CalendarScreenNavigationProp = StackNavigationProp<CalendarStackParamList, 'CalendarScreen'>;

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const insets = useSafeAreaInsets();

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
    const today = new Date().toISOString().split('T')[0];

    // Mark dates with workouts - show dot but no background
    Object.keys(workoutsByDate).forEach((date) => {
      const workoutCount = workoutsByDate[date].length;
      marked[date] = {
        marked: workoutCount > 0,
        dotColor: colors.primary,
        customStyles: {
          container: {
            backgroundColor: 'transparent',
            borderRadius: 16,
          },
          text: {
            color: colors.text,
            fontWeight: workoutCount > 0 ? '600' : '400',
          },
        },
      };
    });

    // Highlight today with light background (works with or without workout)
    if (!marked[today]) {
      marked[today] = {
        marked: false,
        customStyles: {
          container: {
            backgroundColor: colors.highlightBackground,
            borderRadius: 16,
          },
          text: {
            color: colors.text,
            fontWeight: '400',
          },
        },
      };
    } else {
      // Today has a workout - keep the dot, add background
      marked[today] = {
        ...marked[today],
        customStyles: {
          container: {
            backgroundColor: colors.highlightBackground,
            borderRadius: 16,
          },
          text: {
            color: colors.text,
            fontWeight: '600',
          },
        },
      };
    }

    // Selected date gets darker background (overrides everything)
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.primaryAlt,
        customStyles: {
          container: {
            backgroundColor: colors.primaryAlt,
            borderRadius: 16,
          },
          text: {
            color: colors.white,
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

  // Get workouts for selected date
  const selectedDateWorkouts = useMemo(() => {
    return workoutsByDate[selectedDate] || [];
  }, [selectedDate, workoutsByDate]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
      {/* Integrated title */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>Calendar</Text>
      </View>

      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        markingType="custom"
        theme={{
          todayTextColor: colors.primary,
          selectedDayBackgroundColor: colors.primaryAlt,
          selectedDayTextColor: colors.white,
          dotColor: colors.primary,
          arrowColor: colors.primary,
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textMonthFontWeight: '600',
        }}
        enableSwipeMonths={true}
      />

      {/* Workout List Modal */}
      <WorkoutListModal
        visible={modalVisible}
        date={selectedDate}
        workouts={selectedDateWorkouts}
        onClose={() => setModalVisible(false)}
        onSelectWorkout={handleSelectWorkout}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
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
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
