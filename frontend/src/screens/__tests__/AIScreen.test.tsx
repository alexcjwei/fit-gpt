import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AIScreen } from '../AIScreen';
import * as workoutApi from '../../api/workout.api';
import type { Workout } from '../../types/workout.types';

// Mock the workout API
jest.mock('../../api/workout.api');
const mockedParseWorkout = workoutApi.parseWorkout as jest.MockedFunction<
  typeof workoutApi.parseWorkout
>;

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('AIScreen', () => {
  const mockWorkout: Workout = {
    id: 'workout-123',
    name: 'Upper Body Push',
    date: '2024-11-18',
    lastModifiedTime: '2024-11-18T10:00:00Z',
    blocks: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should display the screen title', () => {
      // Arrange & Act
      render(<AIScreen />);

      // Assert
      expect(screen.getByText('AI Workout Parser')).toBeTruthy();
    });

    it('should display the subtitle describing functionality', () => {
      // Arrange & Act
      render(<AIScreen />);

      // Assert
      expect(
        screen.getByText('Paste your workout text and let AI parse it into a structured workout')
      ).toBeTruthy();
    });

    it('should display workout text label', () => {
      // Arrange & Act
      render(<AIScreen />);

      // Assert
      expect(screen.getByText('Workout Text')).toBeTruthy();
    });

    it('should display helper text with character minimum', () => {
      // Arrange & Act
      render(<AIScreen />);

      // Assert
      expect(
        screen.getByText('Minimum 10 characters. Include exercise names, sets, and reps.')
      ).toBeTruthy();
    });

    it('should display tips section', () => {
      // Arrange & Act
      render(<AIScreen />);

      // Assert
      expect(screen.getByText('Tips for better results:')).toBeTruthy();
      expect(screen.getByText('• Use clear exercise names')).toBeTruthy();
      expect(screen.getByText('• Include set and rep information (e.g., "3x10")')).toBeTruthy();
    });

    it('should display parse workout button', () => {
      // Arrange & Act
      render(<AIScreen />);

      // Assert
      expect(screen.getByText('Parse Workout')).toBeTruthy();
    });

    it('should render text input with placeholder', () => {
      // Arrange & Act
      render(<AIScreen />);

      // Assert
      const input = screen.getByDisplayValue('');
      expect(input).toBeTruthy();
      expect(input.props.placeholder).toContain('Upper Body Push');
    });
  });

  describe('Input Validation', () => {
    it('should not call API when button is disabled due to short text', () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');

      // Act
      fireEvent.changeText(input, 'short');
      fireEvent.press(button);

      // Assert - Disabled button doesn't trigger onPress
      expect(mockedParseWorkout).not.toHaveBeenCalled();
    });

    it('should not call API when text is only whitespace', () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');

      // Act - 10 spaces should not pass validation (trimmed to empty)
      fireEvent.changeText(input, '          ');
      fireEvent.press(button);

      // Assert
      expect(mockedParseWorkout).not.toHaveBeenCalled();
    });

    it('should call API when text is 10 or more characters', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      mockedParseWorkout.mockResolvedValue(mockWorkout);

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(mockedParseWorkout).toHaveBeenCalled();
      });
    });

    it('should call API when text is exactly 10 characters', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      mockedParseWorkout.mockResolvedValue(mockWorkout);

      // Act
      fireEvent.changeText(input, '0123456789'); // Exactly 10 chars
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(mockedParseWorkout).toHaveBeenCalledWith('0123456789');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator during parse', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');

      // Mock a delayed response
      mockedParseWorkout.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockWorkout), 100))
      );

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert - Should show loading text
      await waitFor(() => {
        expect(screen.getByText('Parsing your workout...')).toBeTruthy();
      });
    });

    it('should disable input during loading', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');

      // Mock a delayed response
      mockedParseWorkout.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockWorkout), 100))
      );

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(input.props.editable).toBe(false);
      });
    });

    it('should not call API again while loading', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');

      // Mock a delayed response
      mockedParseWorkout.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockWorkout), 100))
      );

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Try to press again while loading
      await waitFor(() => {
        expect(screen.getByText('Parsing your workout...')).toBeTruthy();
      });

      // Try pressing again - should not make another API call since button is disabled
      const loadingButton = screen.getByText('Parsing your workout...');
      fireEvent.press(loadingButton);

      // Assert - Should still only be called once
      await waitFor(() => {
        expect(mockedParseWorkout).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Success Flow', () => {
    it('should call parseWorkout API with trimmed text', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      const workoutText = '  Valid workout text here  ';
      mockedParseWorkout.mockResolvedValue(mockWorkout);

      // Act
      fireEvent.changeText(input, workoutText);
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(mockedParseWorkout).toHaveBeenCalledWith(workoutText.trim());
      });
    });

    it('should navigate to workout details on successful parse', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      mockedParseWorkout.mockResolvedValue(mockWorkout);

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Main');
        expect(mockNavigate).toHaveBeenCalledWith('Workouts', {
          screen: 'WorkoutDetailsScreen',
          params: { workoutId: 'workout-123' },
        });
      });
    });

    it('should clear input text after successful parse', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      mockedParseWorkout.mockResolvedValue(mockWorkout);

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(input.props.value).toBe('');
      });
    });

    it('should handle successful parse with all workout data', async () => {
      // Arrange
      const complexWorkout: Workout = {
        id: 'workout-456',
        name: 'Full Body Workout',
        date: '2024-11-19',
        notes: 'Great session',
        lastModifiedTime: '2024-11-19T15:30:00Z',
        blocks: [
          {
            id: 'block-1',
            label: 'Warm Up',
            exercises: [],
          },
        ],
      };

      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      mockedParseWorkout.mockResolvedValue(complexWorkout);

      // Act
      fireEvent.changeText(input, 'Complex workout with multiple blocks');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Workouts', {
          screen: 'WorkoutDetailsScreen',
          params: { workoutId: 'workout-456' },
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      const errorMessage = 'Failed to parse workout';
      mockedParseWorkout.mockRejectedValue(new Error(errorMessage));

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeTruthy();
      });
    });

    it('should show Alert when parse fails', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      const errorMessage = 'Network error';
      mockedParseWorkout.mockRejectedValue(new Error(errorMessage));

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', errorMessage);
      });
    });

    it('should handle non-Error rejection', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      mockedParseWorkout.mockRejectedValue('String error');

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Failed to parse workout')).toBeTruthy();
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to parse workout');
      });
    });

    it('should not clear input on error', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      const workoutText = 'Valid workout text here';
      mockedParseWorkout.mockRejectedValue(new Error('Parse failed'));

      // Act
      fireEvent.changeText(input, workoutText);
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Parse failed')).toBeTruthy();
      });
      expect(input.props.value).toBe(workoutText);
    });

    it('should not navigate on error', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      mockedParseWorkout.mockRejectedValue(new Error('Parse failed'));

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Parse failed')).toBeTruthy();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should allow retry after error', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');

      // First attempt fails
      mockedParseWorkout.mockRejectedValueOnce(new Error('Network error'));

      // Act - First attempt
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });

      // Clear the mock so we can track the retry
      mockedParseWorkout.mockClear();

      // Second attempt succeeds
      mockedParseWorkout.mockResolvedValue(mockWorkout);
      const retryButton = screen.getByText('Parse Workout');
      fireEvent.press(retryButton);

      // Assert
      await waitFor(() => {
        expect(mockedParseWorkout).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Input Behavior', () => {
    it('should update input value when user types', () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');

      // Act
      fireEvent.changeText(input, 'My workout text');

      // Assert
      expect(input.props.value).toBe('My workout text');
    });

    it('should support multiline text input', () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');

      // Act
      const multilineText = `## Upper Body
Bench Press: 3x8
Overhead Press: 3x10`;
      fireEvent.changeText(input, multilineText);

      // Assert
      expect(input.props.value).toBe(multilineText);
      expect(input.props.multiline).toBe(true);
    });

    it('should display placeholder example text', () => {
      // Arrange & Act
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');

      // Assert
      expect(input.props.placeholder).toContain('## Upper Body Push');
      expect(input.props.placeholder).toContain('**Warm Up**');
      expect(input.props.placeholder).toContain('Bench Press');
    });
  });

  describe('Loading State Transitions', () => {
    it('should re-enable input after successful parse', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      mockedParseWorkout.mockResolvedValue(mockWorkout);

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(input.props.editable).toBe(true);
      });
    });

    it('should re-enable input after failed parse', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      mockedParseWorkout.mockRejectedValue(new Error('Parse failed'));

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Parse failed')).toBeTruthy();
      });
      expect(input.props.editable).toBe(true);
    });

    it('should hide loading indicator after successful parse', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      mockedParseWorkout.mockResolvedValue(mockWorkout);

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
      expect(screen.queryByText('Parsing your workout...')).toBeNull();
    });

    it('should hide loading indicator after failed parse', async () => {
      // Arrange
      render(<AIScreen />);
      const input = screen.getByDisplayValue('');
      const button = screen.getByText('Parse Workout');
      mockedParseWorkout.mockRejectedValue(new Error('Parse failed'));

      // Act
      fireEvent.changeText(input, 'Valid workout text here');
      fireEvent.press(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Parse failed')).toBeTruthy();
      });
      expect(screen.queryByText('Parsing your workout...')).toBeNull();
    });
  });
});
