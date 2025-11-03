import {
  getDateRangePreset,
  formatWorkoutDate,
  formatWorkoutDateShort,
  isToday,
  isYesterday,
  getRelativeDateLabel,
  groupWorkoutsByDate,
  sortWorkoutsByDate,
} from '../workoutFilters';
import type { WorkoutSummary } from '../../types/workout.types';

describe('workoutFilters', () => {
  describe('getDateRangePreset', () => {
    it('should return last 7 days for week preset', () => {
      const result = getDateRangePreset('week');
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const expectedStart = weekAgo.toISOString().split('T')[0];

      expect(result.endDate).toBe(today);
      expect(result.startDate).toBe(expectedStart);
    });

    it('should return last 30 days for month preset', () => {
      const result = getDateRangePreset('month');
      const today = new Date().toISOString().split('T')[0];
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const expectedStart = monthAgo.toISOString().split('T')[0];

      expect(result.endDate).toBe(today);
      expect(result.startDate).toBe(expectedStart);
    });

    it('should return all time for all preset', () => {
      const result = getDateRangePreset('all');
      const today = new Date().toISOString().split('T')[0];

      expect(result.endDate).toBe(today);
      expect(result.startDate).toBe('2000-01-01');
    });
  });

  describe('formatWorkoutDate', () => {
    it('should format date correctly', () => {
      const result = formatWorkoutDate('2024-01-15');
      expect(result).toMatch(/Monday.*Jan.*15.*2024/);
    });

    it('should handle different dates', () => {
      const result = formatWorkoutDate('2024-12-25');
      expect(result).toMatch(/Wednesday.*Dec.*25.*2024/);
    });
  });

  describe('formatWorkoutDateShort', () => {
    it('should format date in short format', () => {
      const result = formatWorkoutDateShort('2024-01-15');
      expect(result).toBe('Jan 15');
    });

    it('should handle different months', () => {
      const result = formatWorkoutDateShort('2024-12-25');
      expect(result).toBe('Dec 25');
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      expect(isToday(yesterdayStr)).toBe(false);
    });

    it('should return false for random date', () => {
      expect(isToday('2024-01-15')).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('should return true for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      expect(isYesterday(yesterdayStr)).toBe(true);
    });

    it('should return false for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isYesterday(today)).toBe(false);
    });

    it('should return false for random date', () => {
      expect(isYesterday('2024-01-15')).toBe(false);
    });
  });

  describe('getRelativeDateLabel', () => {
    it('should return "Today" for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(getRelativeDateLabel(today)).toBe('Today');
    });

    it('should return "Yesterday" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      expect(getRelativeDateLabel(yesterdayStr)).toBe('Yesterday');
    });

    it('should return formatted date for other dates', () => {
      const result = getRelativeDateLabel('2024-01-15');
      expect(result).toMatch(/Monday.*Jan.*15.*2024/);
    });
  });

  describe('groupWorkoutsByDate', () => {
    it('should group workouts by date', () => {
      const workouts: WorkoutSummary[] = [
        {
          id: '1',
          name: 'Workout 1',
          date: '2024-01-15',
          startTime: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          name: 'Workout 2',
          date: '2024-01-15',
          startTime: '2024-01-15T14:00:00Z',
        },
        {
          id: '3',
          name: 'Workout 3',
          date: '2024-01-16',
          startTime: '2024-01-16T10:00:00Z',
        },
      ];

      const result = groupWorkoutsByDate(workouts);

      expect(result['2024-01-15']).toHaveLength(2);
      expect(result['2024-01-15'][0].id).toBe('1');
      expect(result['2024-01-15'][1].id).toBe('2');
      expect(result['2024-01-16']).toHaveLength(1);
      expect(result['2024-01-16'][0].id).toBe('3');
    });

    it('should handle empty array', () => {
      const result = groupWorkoutsByDate([]);
      expect(result).toEqual({});
    });

    it('should handle single workout', () => {
      const workouts: WorkoutSummary[] = [
        {
          id: '1',
          name: 'Workout 1',
          date: '2024-01-15',
          startTime: '2024-01-15T10:00:00Z',
        },
      ];

      const result = groupWorkoutsByDate(workouts);
      expect(result['2024-01-15']).toHaveLength(1);
    });
  });

  describe('sortWorkoutsByDate', () => {
    it('should sort workouts by date descending (newest first)', () => {
      const workouts: WorkoutSummary[] = [
        {
          id: '1',
          name: 'Workout 1',
          date: '2024-01-15',
          startTime: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          name: 'Workout 2',
          date: '2024-01-17',
          startTime: '2024-01-17T10:00:00Z',
        },
        {
          id: '3',
          name: 'Workout 3',
          date: '2024-01-16',
          startTime: '2024-01-16T10:00:00Z',
        },
      ];

      const result = sortWorkoutsByDate(workouts);

      expect(result[0].id).toBe('2'); // 2024-01-17
      expect(result[1].id).toBe('3'); // 2024-01-16
      expect(result[2].id).toBe('1'); // 2024-01-15
    });

    it('should sort by start time when dates are the same', () => {
      const workouts: WorkoutSummary[] = [
        {
          id: '1',
          name: 'Workout 1',
          date: '2024-01-15',
          startTime: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          name: 'Workout 2',
          date: '2024-01-15',
          startTime: '2024-01-15T14:00:00Z',
        },
        {
          id: '3',
          name: 'Workout 3',
          date: '2024-01-15',
          startTime: '2024-01-15T08:00:00Z',
        },
      ];

      const result = sortWorkoutsByDate(workouts);

      expect(result[0].id).toBe('2'); // 14:00
      expect(result[1].id).toBe('1'); // 10:00
      expect(result[2].id).toBe('3'); // 08:00
    });

    it('should not mutate original array', () => {
      const workouts: WorkoutSummary[] = [
        {
          id: '1',
          name: 'Workout 1',
          date: '2024-01-15',
          startTime: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          name: 'Workout 2',
          date: '2024-01-17',
          startTime: '2024-01-17T10:00:00Z',
        },
      ];

      const original = [...workouts];
      sortWorkoutsByDate(workouts);

      expect(workouts).toEqual(original);
    });

    it('should handle empty array', () => {
      const result = sortWorkoutsByDate([]);
      expect(result).toEqual([]);
    });
  });
});
