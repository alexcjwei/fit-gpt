/**
 * Workout Types
 * Copied from backend/src/types/index.ts and extended for frontend use
 */

// ============================================
// Core Workout Types (from Backend)
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
  exerciseName: string; // Resolved exercise name (populated by backend)
  orderInBlock: number; // Position within the block (0-indexed)
  sets: SetInstance[];
  instruction?: string; // e.g., "3 x 8", "3 x 8-10 x 135 lbs", "3 x 30 sec (Rest 90 sec)"
  notes?: string;
}

export interface SetInstance {
  id: string; // UUID v4
  setNumber: number; // 1-indexed
  reps?: number | null; // Backend sends null for unfilled values
  weight?: number | null; // Backend sends null for unfilled values
  weightUnit: 'lbs' | 'kg';
  duration?: number | null; // Backend sends null for unfilled values (Duration in seconds for time-based exercises)
  rpe?: number | null; // Rate of perceived exertion (1-10)
  notes?: string | null;
}

/**
 * Helper function to determine if a set is completed
 * A set is considered completed if it has reps, weight, or duration filled in
 * Note: Backend sends null for unfilled values, so we check for both null and undefined
 */
export const isSetCompleted = (set: SetInstance): boolean => {
  return (
    (set.reps !== undefined && set.reps !== null) ||
    (set.weight !== undefined && set.weight !== null) ||
    (set.duration !== undefined && set.duration !== null)
  );
};

// ============================================
// Exercise Types (from Backend)
// ============================================

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'abs'
  | 'obliques'
  | 'lower-back'
  | 'upper-back'
  | 'calves'
  | 'forearms'
  | 'traps'
  | 'lats'
  | 'rear-delts'
  | 'hip-flexors';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'bodyweight'
  | 'machine'
  | 'bands'
  | 'kettlebell'
  | 'smith-machine'
  | 'trap-bar'
  | 'ez-bar'
  | 'plate'
  | 'medicine-ball'
  | 'ab-wheel'
  | 'suspension'
  | 'sled'
  | 'box'
  | 'bench'
  | 'pull-up-bar'
  | 'dip-bar'
  | 'cardio-machine';

export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'
  | 'olympic'
  | 'full-body'
  | 'stretching';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type MovementPattern =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'carry'
  | 'rotation'
  | 'anti-rotation'
  | 'isometric'
  | 'plyometric'
  | 'olympic';

export interface Exercise {
  id: string; // MongoDB ObjectId as string
  slug?: string; // Human-readable identifier (e.g., 'barbell-bench-press-flat')
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  equipment: Equipment[];
  difficulty?: DifficultyLevel;
  movementPattern?: MovementPattern;
  isUnilateral?: boolean;
  isCompound?: boolean;
  description?: string;
  setupInstructions?: string;
  formCues?: string[];
  videoUrl?: string;
  alternativeExerciseIds?: string[];
  tags?: string[];
}

// ============================================
// Frontend-Specific Types
// ============================================

/**
 * Simplified workout summary for calendar view
 */
export interface WorkoutSummary {
  id: string;
  name: string;
  date: string;
}

/**
 * Mapping of dates to workouts for calendar display
 * Key: ISO date string (YYYY-MM-DD)
 * Value: Array of workout summaries
 */
export interface CalendarDateWorkouts {
  [date: string]: WorkoutSummary[];
}

/**
 * Request body for parsing workout text
 */
export interface ParseWorkoutRequest {
  text: string;
  date?: string; // ISO 8601 date, defaults to today
  weightUnit?: 'lbs' | 'kg'; // defaults to 'lbs'
}

/**
 * Request body for duplicating a workout
 */
export interface DuplicateWorkoutRequest {
  newDate?: string; // ISO 8601 date, defaults to today
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    workouts: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

/**
 * Response from GET /api/workouts/calendar
 */
export type CalendarWorkoutsResponse = ApiResponse<Workout[]>;

/**
 * Response from GET /api/workouts/:id
 */
export type WorkoutResponse = ApiResponse<Workout>;

/**
 * Response from POST /api/workouts
 */
export type CreateWorkoutResponse = ApiResponse<Workout>;

/**
 * Response from POST /api/workouts/:id/duplicate
 */
export type DuplicateWorkoutResponse = ApiResponse<Workout>;

/**
 * Response from POST /api/workouts/parse
 */
export type ParseWorkoutResponse = ApiResponse<Workout>;

/**
 * Response from DELETE /api/workouts/:id
 */
export type DeleteWorkoutResponse = ApiResponse<void>;
