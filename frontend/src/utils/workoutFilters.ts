import type { WorkoutSummary } from '../types/workout.types';

/**
 * Date range preset types
 */
export type DateRangePreset = 'week' | 'month' | 'all';

/**
 * Get date range for a given preset
 */
export function getDateRangePreset(preset: DateRangePreset): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];

  let startDate: string;

  switch (preset) {
    case 'week':
      // Last 7 days
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
      break;

    case 'month':
      // Last 30 days
      const monthAgo = new Date(now);
      monthAgo.setDate(now.getDate() - 30);
      startDate = monthAgo.toISOString().split('T')[0];
      break;

    case 'all':
      // All time (start from a very early date)
      startDate = '2000-01-01';
      break;

    default:
      // Default to last 7 days
      const defaultStart = new Date(now);
      defaultStart.setDate(now.getDate() - 7);
      startDate = defaultStart.toISOString().split('T')[0];
  }

  return { startDate, endDate };
}

/**
 * Format workout date for display
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "Monday, Jan 15, 2024")
 */
export function formatWorkoutDate(date: string): string {
  // Parse as local date to avoid timezone issues
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format workout date in short format
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Short formatted date (e.g., "Jan 15")
 */
export function formatWorkoutDateShort(date: string): string {
  // Parse as local date to avoid timezone issues
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Check if a date is today
 */
export function isToday(date: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return date === today;
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(date: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date === yesterday.toISOString().split('T')[0];
}

/**
 * Get relative date label (Today, Yesterday, or formatted date)
 */
export function getRelativeDateLabel(date: string): string {
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return formatWorkoutDate(date);
}

/**
 * Group workouts by date
 * @param workouts Array of workout summaries
 * @returns Object mapping dates to arrays of workouts
 */
export function groupWorkoutsByDate(
  workouts: WorkoutSummary[]
): { [date: string]: WorkoutSummary[] } {
  const grouped: { [date: string]: WorkoutSummary[] } = {};

  workouts.forEach((workout) => {
    const date = workout.date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(workout);
  });

  return grouped;
}

/**
 * Sort workouts by date (newest first)
 */
export function sortWorkoutsByDate(
  workouts: WorkoutSummary[]
): WorkoutSummary[] {
  if (!workouts || !Array.isArray(workouts)) {
    return [];
  }

  // Use slice() instead of spread operator for better compatibility
  return workouts.slice().sort((a, b) => {
    // Sort by date descending (newest first)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}
