import { getExercises, searchExercises } from '../exercise.api';
import apiClient from '../client';
import type { Exercise } from '../../types/workout.types';

// Mock the API client
jest.mock('../client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Exercise API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockExercise: Exercise = {
    id: '507f1f77bcf86cd799439011',
    slug: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    tags: ['chest', 'push', 'barbell', 'compound'],
  };

  describe('getExercises', () => {
    it('should fetch exercises with no params', async () => {
      const mockExercises = [mockExercise];
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            exercises: mockExercises,
            pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      });

      const result = await getExercises();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exercises', {
        params: {},
      });
      expect(result.exercises).toEqual(mockExercises);
      expect(result.pagination.total).toBe(1);
    });

    it('should fetch exercises with search query', async () => {
      const mockExercises = [mockExercise];
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            exercises: mockExercises,
            pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      });

      const result = await getExercises({ search: 'bench' });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exercises', {
        params: { search: 'bench' },
      });
      expect(result.exercises).toEqual(mockExercises);
    });

    it('should fetch exercises with pagination params', async () => {
      const mockExercises = [mockExercise];
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            exercises: mockExercises,
            pagination: { total: 100, page: 2, limit: 20, totalPages: 5 },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      });

      const result = await getExercises({ page: 2, limit: 20 });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exercises', {
        params: { page: 2, limit: 20 },
      });
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should fetch exercises with all params', async () => {
      const mockExercises = [mockExercise];
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            exercises: mockExercises,
            pagination: { total: 10, page: 1, limit: 10, totalPages: 1 },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      });

      const result = await getExercises({
        search: 'bench',
        page: 1,
        limit: 10,
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exercises', {
        params: {
          search: 'bench',
          page: 1,
          limit: 10,
        },
      });
      expect(result.exercises).toEqual(mockExercises);
    });

    it('should return empty array if no data', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            exercises: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      });

      const result = await getExercises();

      expect(result.exercises).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should throw error on API failure', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(getExercises()).rejects.toThrow('Network error');
    });
  });

  describe('searchExercises', () => {
    it('should search exercises by name', async () => {
      const mockResults = [
        {
          exercise: mockExercise,
          score: 0.1,
        },
      ];
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            results: mockResults,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      });

      const result = await searchExercises('bench press');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exercises/search', {
        params: { q: 'bench press', limit: 5 },
      });
      expect(result).toEqual(mockResults);
    });

    it('should search exercises with custom limit', async () => {
      const mockResults = [
        {
          exercise: mockExercise,
          score: 0.1,
        },
      ];
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            results: mockResults,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      });

      const result = await searchExercises('bench', 10);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/exercises/search', {
        params: { q: 'bench', limit: 10 },
      });
      expect(result).toEqual(mockResults);
    });

    it('should return empty array if no results', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            results: [],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as unknown,
      });

      const result = await searchExercises('nonexistent');

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(searchExercises('bench')).rejects.toThrow('Network error');
    });
  });
});
