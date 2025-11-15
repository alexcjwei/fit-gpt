import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ExerciseBrowserScreen } from '../ExerciseBrowserScreen';
import * as useExercisesHook from '../../hooks/useExercises';
import type { ExercisesResponse } from '../../types/workout.types';

// Mock the useExercises hook
jest.mock('../../hooks/useExercises');
const mockedUseExercises = useExercisesHook.useExercises as jest.MockedFunction<
  typeof useExercisesHook.useExercises
>;

describe('ExerciseBrowserScreen', () => {
  const mockExercises: ExercisesResponse = {
    exercises: [
      {
        id: '1',
        slug: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        tags: ['chest', 'push', 'barbell', 'compound'],
      },
      {
        id: '2',
        slug: 'squat',
        name: 'Barbell Squat',
        tags: ['legs', 'quads'],
      },
    ],
    pagination: {
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading indicator and text when loading', () => {
      // Arrange
      mockedUseExercises.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('Loading exercises...')).toBeTruthy();
    });
  });

  describe('Success State', () => {
    it('should display exercises list when data is loaded', () => {
      // Arrange
      mockedUseExercises.mockReturnValue({
        data: mockExercises,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('Barbell Bench Press')).toBeTruthy();
      expect(screen.getByText('Barbell Squat')).toBeTruthy();
    });

    it('should display exercise tags', () => {
      // Arrange
      mockedUseExercises.mockReturnValue({
        data: mockExercises,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('chest')).toBeTruthy();
      expect(screen.getByText('push')).toBeTruthy();
      expect(screen.getByText('barbell')).toBeTruthy();
    });

    it('should display results count', () => {
      // Arrange
      mockedUseExercises.mockReturnValue({
        data: mockExercises,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('2 exercises found')).toBeTruthy();
    });

    it('should display singular "exercise" for count of 1', () => {
      // Arrange
      const singleExerciseData: ExercisesResponse = {
        exercises: [mockExercises.exercises[0]],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockedUseExercises.mockReturnValue({
        data: singleExerciseData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('1 exercise found')).toBeTruthy();
    });

    it('should show more tags indicator when exercise has more than 3 tags', () => {
      // Arrange
      const manyTagsData: ExercisesResponse = {
        exercises: [
          {
            id: '1',
            slug: 'exercise',
            name: 'Exercise With Many Tags',
            tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
          },
        ],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockedUseExercises.mockReturnValue({
        data: manyTagsData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('+2 more')).toBeTruthy();
    });
  });

  describe('Pagination', () => {
    it('should display page information when multiple pages exist', () => {
      // Arrange
      const multiPageData: ExercisesResponse = {
        exercises: mockExercises.exercises,
        pagination: { total: 50, page: 1, limit: 20, totalPages: 3 },
      };
      mockedUseExercises.mockReturnValue({
        data: multiPageData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('Page 1 of 3')).toBeTruthy();
    });

    it('should show load more button when more pages available', () => {
      // Arrange
      const multiPageData: ExercisesResponse = {
        exercises: mockExercises.exercises,
        pagination: { total: 50, page: 1, limit: 20, totalPages: 3 },
      };
      mockedUseExercises.mockReturnValue({
        data: multiPageData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('Load More')).toBeTruthy();
    });

    it('should not show load more button when only one page exists', () => {
      // Arrange
      const singlePageData: ExercisesResponse = {
        exercises: mockExercises.exercises,
        pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
      };
      mockedUseExercises.mockReturnValue({
        data: singlePageData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.queryByText('Load More')).toBeNull();
    });
  });

  describe('Search Functionality', () => {
    it('should render search input with placeholder', () => {
      // Arrange
      mockedUseExercises.mockReturnValue({
        data: mockExercises,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByPlaceholderText('Search exercises...')).toBeTruthy();
    });

    it('should update search input when user types', () => {
      // Arrange
      mockedUseExercises.mockReturnValue({
        data: mockExercises,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);
      const searchInput = screen.getByPlaceholderText('Search exercises...');
      fireEvent.changeText(searchInput, 'bench');

      // Assert
      expect(searchInput.props.value).toBe('bench');
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no exercises found', () => {
      // Arrange
      const emptyData: ExercisesResponse = {
        exercises: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockedUseExercises.mockReturnValue({
        data: emptyData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('No exercises available')).toBeTruthy();
    });

    it('should show search-specific message when search returns no results', async () => {
      // Arrange
      const emptyData: ExercisesResponse = {
        exercises: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockedUseExercises.mockReturnValue({
        data: emptyData,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);
      const searchInput = screen.getByPlaceholderText('Search exercises...');
      fireEvent.changeText(searchInput, 'nonexistent');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No exercises found')).toBeTruthy();
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', () => {
      // Arrange
      const mockError = new Error('Network error');
      mockedUseExercises.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: mockError,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('Error: Network error')).toBeTruthy();
    });

    it('should show retry button when error occurs', () => {
      // Arrange
      const mockError = new Error('Network error');
      mockedUseExercises.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: mockError,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    it('should call refetch when retry button is pressed', () => {
      // Arrange
      const mockRefetch = jest.fn();
      const mockError = new Error('Network error');
      mockedUseExercises.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: mockError,
        refetch: mockRefetch,
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);
      const retryButton = screen.getByText('Retry');
      fireEvent.press(retryButton);

      // Assert
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should show default error message when error has no message', () => {
      // Arrange
      mockedUseExercises.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      // Act
      render(<ExerciseBrowserScreen />);

      // Assert
      expect(screen.getByText('Error: Failed to load exercises')).toBeTruthy();
    });
  });
});
