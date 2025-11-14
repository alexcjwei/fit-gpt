import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Core Workout Types
// ============================================

export interface Workout {
  id: string; // MongoDB ObjectId as string (24 hex chars)
  name: string;
  date: string; // ISO 8601 date (YYYY-MM-DD)
  lastModifiedTime: string; // ISO 8601 timestamp
  notes?: string;
  blocks: WorkoutBlock[];
}

export interface WorkoutBlock {
  id: string; // UUID v4
  label?: string; // e.g., "Warm Up", "Superset A", "Cool Down"
  exercises: ExerciseInstance[];
  notes?: string;
}

export interface ExerciseInstance {
  id: string; // UUID v4
  exerciseId: string; // Reference to exercise definition
  orderInBlock: number; // Position within the block (0-indexed)
  sets: SetInstance[];
  instruction?: string; // e.g., "3 x 8", "3 x 8-10 x 135 lbs", "3 x 30 sec (Rest 90 sec)"
  notes?: string;
}

// ============================================
// Frontend Presentation Types
// ============================================

/**
 * ExerciseInstance with resolved exercise name for frontend presentation
 * Separates NoSQL data models from frontend API responses
 */
export interface ExerciseInstanceResponse extends ExerciseInstance {
  exerciseName: string; // Resolved from exerciseId
}

export interface WorkoutBlockResponse extends Omit<WorkoutBlock, 'exercises'> {
  exercises: ExerciseInstanceResponse[];
}

export interface WorkoutResponse extends Omit<Workout, 'blocks'> {
  blocks: WorkoutBlockResponse[];
}

export interface SetInstance {
  id: string; // UUID v4
  setNumber: number; // 1-indexed
  reps?: number | null; // null means field is explicitly cleared
  weight?: number | null; // null means field is explicitly cleared
  weightUnit: 'lbs' | 'kg';
  duration?: number | null; // null means field is explicitly cleared (Duration in seconds for time-based exercises)
  rpe?: number | null; // Rate of perceived exertion (1-10)
  notes?: string | null;
}

/**
 * Helper function to determine if a set is completed
 * A set is considered completed if it has reps, weight, or duration filled in
 * Note: null means explicitly cleared, so it's not considered completed
 */
export const isSetCompleted = (set: SetInstance): boolean => {
  return (
    (set.reps !== undefined && set.reps !== null) ||
    (set.weight !== undefined && set.weight !== null) ||
    (set.duration !== undefined && set.duration !== null)
  );
};

export interface Exercise {
  id: string; // MongoDB ObjectId as string
  slug: string; // Human-readable identifier (e.g., 'barbell-bench-press')
  name: string;
  tags?: string[]; // Flexible categorization (e.g., 'chest', 'push', 'barbell', 'beginner', 'compound')
  needsReview?: boolean; // True for exercises auto-created by LLM during workout parsing
}

export interface User {
  id: string; // Database ID as string
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  password: string; // Only included in auth-specific methods
}
