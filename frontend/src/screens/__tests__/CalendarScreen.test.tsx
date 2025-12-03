import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CalendarScreen } from '../CalendarScreen';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { WorkoutSummary } from '../../types/workout.types';
import { colors } from '../../theme';

// Mock dependencies
jest.mock('@tanstack/react-query');
jest.mock('@react-navigation/native');

// Capture the Calendar props for testing
let capturedCalendarProps: any = null;

jest.mock('react-native-calendars', () => ({
  Calendar: jest.fn((props) => {
    capturedCalendarProps = props;
    const { View } = require('react-native');
    return <View testID="calendar" />;
  }),
}));
jest.mock('../../components/workout/WorkoutListModal', () => ({
  WorkoutListModal: jest.fn(({ workouts }: { workouts: WorkoutSummary[] }) => {
    const { Text, View } = require('react-native');
    return (
      <View testID="workout-list-modal">
        <Text testID="workout-count">{workouts.length}</Text>
        {workouts.map((w) => (
          <Text key={w.id} testID={`workout-${w.id}`}>
            {w.name}
          </Text>
        ))}
      </View>
    );
  }),
}));

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockedUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;

describe('CalendarScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCalendarProps = null;
    mockedUseNavigation.mockReturnValue(mockNavigation as any);
  });

  describe('Initial Rendering', () => {
    it('should display the integrated screen title', () => {
      // Arrange
      mockedUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      // Act
      render(<CalendarScreen />);

      // Assert
      expect(screen.getByText('Calendar')).toBeTruthy();
    });
  });

  describe('Workout Display', () => {
    it('should not include mock workout in workout list', () => {
      // Arrange
      const mockWorkouts: WorkoutSummary[] = [
        {
          id: 'real-workout-1',
          name: 'Morning Workout',
          date: '2025-11-15',
        },
        {
          id: 'real-workout-2',
          name: 'Evening Workout',
          date: '2025-11-15',
        },
      ];

      mockedUseQuery.mockReturnValue({
        data: mockWorkouts,
        isLoading: false,
        error: null,
      } as any);

      // Act
      render(<CalendarScreen />);

      // Assert - should not display mock workout
      expect(screen.queryByText('Mock Workout')).toBeNull();
      expect(screen.queryByTestId('workout-mock-workout-123')).toBeNull();
    });

    it('should pass only real workouts to WorkoutListModal', () => {
      // Arrange
      const mockWorkouts: WorkoutSummary[] = [
        {
          id: 'workout-1',
          name: 'Leg Day',
          date: '2025-11-20',
        },
        {
          id: 'workout-2',
          name: 'Arm Day',
          date: '2025-11-20',
        },
      ];

      mockedUseQuery.mockReturnValue({
        data: mockWorkouts,
        isLoading: false,
        error: null,
      } as any);

      // Act
      render(<CalendarScreen />);

      // Assert - modal should not receive mock workout with id 'mock-workout-123'
      expect(screen.queryByTestId('workout-mock-workout-123')).toBeNull();
    });
  });

  describe('Empty Date Selection', () => {
    it('should show no workouts when selecting date with no workouts', () => {
      // Arrange
      const mockWorkouts: WorkoutSummary[] = [];

      mockedUseQuery.mockReturnValue({
        data: mockWorkouts,
        isLoading: false,
        error: null,
      } as any);

      // Act
      render(<CalendarScreen />);

      // Assert - should not show mock workout
      expect(screen.queryByTestId('workout-mock-workout-123')).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when fetching workouts', () => {
      // Arrange
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      // Act
      render(<CalendarScreen />);

      // Assert
      expect(screen.getByText('Loading calendar...')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', () => {
      // Arrange
      const mockError = new Error('Network error');
      mockedUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
      } as any);

      // Act
      render(<CalendarScreen />);

      // Assert
      expect(screen.getByText('Failed to load workouts')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  describe('Calendar Visual Indicators', () => {
    beforeEach(() => {
      // Mock current date to a known value for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-11-20T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should show blue dot indicator for dates with workouts', () => {
      // Arrange
      const mockWorkouts: WorkoutSummary[] = [
        {
          id: 'workout-1',
          name: 'Leg Day',
          date: '2025-11-15',
        },
      ];

      mockedUseQuery.mockReturnValue({
        data: mockWorkouts,
        isLoading: false,
        error: null,
      } as any);

      // Act
      render(<CalendarScreen />);

      // Assert
      expect(capturedCalendarProps).toBeTruthy();
      const markedDates = capturedCalendarProps.markedDates;
      expect(markedDates['2025-11-15']).toBeDefined();
      expect(markedDates['2025-11-15'].marked).toBe(true);
      expect(markedDates['2025-11-15'].dotColor).toBe(colors.primary);
    });

    it('should show light background for today without removing dot for workouts', () => {
      // Arrange - today is 2025-11-20 with a workout
      const mockWorkouts: WorkoutSummary[] = [
        {
          id: 'workout-today',
          name: 'Today Workout',
          date: '2025-11-20',
        },
      ];

      mockedUseQuery.mockReturnValue({
        data: mockWorkouts,
        isLoading: false,
        error: null,
      } as any);

      // Act
      render(<CalendarScreen />);

      // Assert
      expect(capturedCalendarProps).toBeTruthy();
      const markedDates = capturedCalendarProps.markedDates;
      const todayMarking = markedDates['2025-11-20'];

      // Should have both workout dot and today background
      expect(todayMarking.marked).toBe(true);
      expect(todayMarking.dotColor).toBe(colors.primary);
      expect(todayMarking.customStyles.container.backgroundColor).toBe(colors.highlightBackground);
    });

    it('should show today background even without workouts', () => {
      // Arrange - today is 2025-11-20 with NO workouts
      const mockWorkouts: WorkoutSummary[] = [];

      mockedUseQuery.mockReturnValue({
        data: mockWorkouts,
        isLoading: false,
        error: null,
      } as any);

      // Act
      render(<CalendarScreen />);

      // Assert
      expect(capturedCalendarProps).toBeTruthy();
      const markedDates = capturedCalendarProps.markedDates;
      const todayMarking = markedDates['2025-11-20'];

      // Should have today background but no dot
      expect(todayMarking).toBeDefined();
      expect(todayMarking.marked).toBeFalsy();
      expect(todayMarking.customStyles.container.backgroundColor).toBe(colors.highlightBackground);
    });

    it('should use theme colors instead of hardcoded values', () => {
      // Arrange
      const mockWorkouts: WorkoutSummary[] = [
        {
          id: 'workout-1',
          name: 'Test Workout',
          date: '2025-11-15',
        },
      ];

      mockedUseQuery.mockReturnValue({
        data: mockWorkouts,
        isLoading: false,
        error: null,
      } as any);

      // Act
      render(<CalendarScreen />);

      // Assert
      expect(capturedCalendarProps).toBeTruthy();
      const calendarTheme = capturedCalendarProps.theme;

      // Verify theme uses colors from theme, not hardcoded blue
      expect(calendarTheme.dotColor).toBe(colors.primary);
      expect(calendarTheme.selectedDayBackgroundColor).toBe(colors.primaryAlt);
      expect(calendarTheme.todayTextColor).toBe(colors.primary);
    });

    it('should not show background for workout dates that are not today', () => {
      // Arrange
      const mockWorkouts: WorkoutSummary[] = [
        {
          id: 'workout-past',
          name: 'Past Workout',
          date: '2025-11-15',
        },
      ];

      mockedUseQuery.mockReturnValue({
        data: mockWorkouts,
        isLoading: false,
        error: null,
      } as any);

      // Act
      render(<CalendarScreen />);

      // Assert
      expect(capturedCalendarProps).toBeTruthy();
      const markedDates = capturedCalendarProps.markedDates;
      const pastDateMarking = markedDates['2025-11-15'];

      // Should have dot but NO background (since it's not today)
      expect(pastDateMarking.marked).toBe(true);
      expect(pastDateMarking.customStyles.container.backgroundColor).toBe('transparent');
    });
  });
});
