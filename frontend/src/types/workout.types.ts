/**
 * Workout Types
 * Copied from backend/src/types/index.ts and extended for frontend use
 */

// ============================================
// Core Workout Types (from Backend)
// ============================================

export interface Workout {
  id: string; // UUID v4
  name: string;
  date: string; // ISO 8601 date (YYYY-MM-DD)
  startTime?: string; // ISO 8601 timestamp
  lastModifiedTime: string; // ISO 8601 timestamp
  notes?: string;
  blocks: WorkoutBlock[];
}

export interface WorkoutBlock {
  id: string; // UUID v4
  label?: string; // e.g., "Warm Up", "Superset A", "Cool Down"
  exercises: ExerciseInstance[];
  restPeriod?: string; // e.g., "2-3 min", "90 sec"
  notes?: string;
}

export interface ExerciseInstance {
  id: string; // UUID v4
  exerciseId: string; // Reference to exercise definition
  orderInBlock: number; // Position within the block (0-indexed)
  sets: SetInstance[];
  restPeriod?: string; // e.g., "60 sec", "2 min"
  notes?: string;
}

export interface SetInstance {
  id: string; // UUID v4
  setNumber: number; // 1-indexed
  targetRepsMin?: number; // Minimum reps in range (e.g., 6 in "6-8 reps")
  targetRepsMax?: number; // Maximum reps in range (e.g., 8 in "6-8 reps")
  actualReps?: number;
  targetWeight?: number;
  actualWeight?: number;
  weightUnit: 'lbs' | 'kg';
  targetDuration?: number; // Target duration in seconds for time-based exercises (e.g., planks)
  actualDuration?: number; // Actual duration in seconds performed
  rpe?: number; // Rate of perceived exertion (1-10)
  notes?: string;
}

/**
 * Helper function to determine if a set is completed
 * A set is considered completed if it has actualReps, actualWeight, or actualDuration filled in
 */
export const isSetCompleted = (set: SetInstance): boolean => {
  return (
    set.actualReps !== undefined ||
    set.actualWeight !== undefined ||
    set.actualDuration !== undefined
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
  startTime?: string;
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
