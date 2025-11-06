import { getWorkoutsCalendar, getWorkout, createWorkout, duplicateWorkout, getWorkouts, deleteWorkout } from '../workout.api';
import apiClient from '../client';
import type { Workout } from '../../types/workout.types';

// Mock the API client
jest.mock('../client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Workout API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockWorkout: Workout = {
    id: 'workout-123',
    name: 'Upper Body Day',
    date: '2025-11-01',
    lastModifiedTime: '2025-11-01T10:00:00Z',
    blocks: [
      {
        id: 'block-1',
        label: 'Warm Up',
        exercises: [],
      },
    ],
  };

  describe('getWorkoutsCalendar', () => {
    it('should fetch workouts for a date range', async () => {
      const mockWorkouts = [mockWorkout];
      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockWorkouts },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await getWorkoutsCalendar('2025-11-01', '2025-11-30');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/workouts/calendar', {
        params: { startDate: '2025-11-01', endDate: '2025-11-30' },
      } as Parameters<typeof mockedApiClient.get>[1]);
      expect(result).toEqual(mockWorkouts);
    });

    it('should return empty array if no data', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await getWorkoutsCalendar('2025-11-01', '2025-11-30');

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(
        getWorkoutsCalendar('2025-11-01', '2025-11-30')
      ).rejects.toThrow('Network error');
    });
  });

  describe('getWorkout', () => {
    it('should fetch a single workout by ID', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { success: true, data: mockWorkout },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await getWorkout('workout-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/workouts/workout-123', undefined);
      expect(result).toEqual(mockWorkout);
    });

    it('should throw error if workout not found', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { success: false, error: 'Not found' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
      });

      await expect(getWorkout('invalid-id')).rejects.toThrow('Workout not found');
    });

    it('should throw error on API failure', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(getWorkout('workout-123')).rejects.toThrow('Network error');
    });
  });

  describe('createWorkout', () => {
    it('should create a new workout', async () => {
      const newWorkout: Workout = {
        id: 'new-workout-456',
        name: 'Lower Body Day',
        date: '2025-11-02',
        lastModifiedTime: '2025-11-02T10:00:00Z',
        blocks: [],
      };

      mockedApiClient.post.mockResolvedValue({
        data: { success: true, data: newWorkout },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      });

      const result = await createWorkout(newWorkout);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/workouts', newWorkout, undefined);
      expect(result).toEqual(newWorkout);
    });

    it('should throw error if creation fails', async () => {
      const newWorkout: Workout = {
        id: 'new-workout-456',
        name: 'Lower Body Day',
        date: '2025-11-02',
        lastModifiedTime: '2025-11-02T10:00:00Z',
        blocks: [],
      };

      mockedApiClient.post.mockResolvedValue({
        data: { success: false, error: 'Validation error' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      });

      await expect(createWorkout(newWorkout)).rejects.toThrow('Failed to create workout');
    });

    it('should throw error on API failure', async () => {
      const newWorkout: Workout = {
        id: 'new-workout-456',
        name: 'Lower Body Day',
        date: '2025-11-02',
        lastModifiedTime: '2025-11-02T10:00:00Z',
        blocks: [],
      };

      mockedApiClient.post.mockRejectedValue(new Error('Network error'));

      await expect(createWorkout(newWorkout)).rejects.toThrow('Network error');
    });
  });

  describe('duplicateWorkout', () => {
    it('should duplicate a workout with a new date', async () => {
      const duplicatedWorkout: Workout = {
        ...mockWorkout,
        id: 'duplicated-workout-789',
        date: '2025-11-08',
      };

      mockedApiClient.post.mockResolvedValue({
        data: { success: true, data: duplicatedWorkout },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      });

      const result = await duplicateWorkout('workout-123', '2025-11-08');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/workouts/workout-123/duplicate',
        { newDate: '2025-11-08' },
        undefined
      );
      expect(result).toEqual(duplicatedWorkout);
    });

    it('should duplicate a workout without specifying a new date', async () => {
      const duplicatedWorkout: Workout = {
        ...mockWorkout,
        id: 'duplicated-workout-789',
      };

      mockedApiClient.post.mockResolvedValue({
        data: { success: true, data: duplicatedWorkout },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      });

      const result = await duplicateWorkout('workout-123');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/workouts/workout-123/duplicate',
        {},
        undefined
      );
      expect(result).toEqual(duplicatedWorkout);
    });

    it('should throw error if duplication fails', async () => {
      mockedApiClient.post.mockResolvedValue({
        data: { success: false, error: 'Workout not found' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
      });

      await expect(duplicateWorkout('invalid-id')).rejects.toThrow(
        'Failed to duplicate workout'
      );
    });

    it('should throw error on API failure', async () => {
      mockedApiClient.post.mockRejectedValue(new Error('Network error'));

      await expect(duplicateWorkout('workout-123')).rejects.toThrow('Network error');
    });
  });

  describe('getWorkouts', () => {
    it('should fetch workouts with no params', async () => {
      const mockWorkouts = [mockWorkout];
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            workouts: mockWorkouts,
            pagination: { page: 1, limit: 20, total: 1, pages: 1 },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await getWorkouts();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/workouts', {
        params: undefined,
      } as Parameters<typeof mockedApiClient.get>[1]);
      expect(result).toEqual(mockWorkouts);
    });

    it('should fetch workouts with date range', async () => {
      const mockWorkouts = [mockWorkout];
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            workouts: mockWorkouts,
            pagination: { page: 1, limit: 20, total: 1, pages: 1 },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await getWorkouts({
        startDate: '2025-11-01',
        endDate: '2025-11-30',
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/workouts', {
        params: { startDate: '2025-11-01', endDate: '2025-11-30' },
      } as Parameters<typeof mockedApiClient.get>[1]);
      expect(result).toEqual(mockWorkouts);
    });

    it('should fetch workouts with pagination', async () => {
      const mockWorkouts = [mockWorkout];
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            workouts: mockWorkouts,
            pagination: { page: 1, limit: 20, total: 1, pages: 1 },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await getWorkouts({ limit: 20, offset: 0 });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/workouts', {
        params: { limit: 20, offset: 0 },
      } as Parameters<typeof mockedApiClient.get>[1]);
      expect(result).toEqual(mockWorkouts);
    });

    it('should fetch workouts with all params', async () => {
      const mockWorkouts = [mockWorkout];
      mockedApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            workouts: mockWorkouts,
            pagination: { page: 1, limit: 20, total: 1, pages: 1 },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await getWorkouts({
        startDate: '2025-11-01',
        endDate: '2025-11-30',
        limit: 20,
        offset: 0,
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/workouts', {
        params: {
          startDate: '2025-11-01',
          endDate: '2025-11-30',
          limit: 20,
          offset: 0,
        },
      } as Parameters<typeof mockedApiClient.get>[1]);
      expect(result).toEqual(mockWorkouts);
    });

    it('should return empty array if no data', async () => {
      mockedApiClient.get.mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await getWorkouts();

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(getWorkouts()).rejects.toThrow('Network error');
    });
  });

  describe('deleteWorkout', () => {
    it('should delete a workout by ID', async () => {
      mockedApiClient.delete.mockResolvedValue({
        data: { success: true, message: 'Workout deleted' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await deleteWorkout('workout-123');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/workouts/workout-123', undefined);
    });

    it('should throw error if delete fails', async () => {
      mockedApiClient.delete.mockResolvedValue({
        data: { success: false, message: 'Workout not found' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
      });

      await expect(deleteWorkout('invalid-id')).rejects.toThrow('Workout not found');
    });

    it('should throw error on API failure', async () => {
      mockedApiClient.delete.mockRejectedValue(new Error('Network error'));

      await expect(deleteWorkout('workout-123')).rejects.toThrow('Network error');
    });
  });
});
