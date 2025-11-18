import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CalendarScreen } from '../CalendarScreen';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { WorkoutSummary } from '../../types/workout.types';

// Mock dependencies
jest.mock('@tanstack/react-query');
jest.mock('@react-navigation/native');
jest.mock('react-native-calendars', () => ({
  Calendar: jest.fn(() => {
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
    mockedUseNavigation.mockReturnValue(mockNavigation as any);
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
});
