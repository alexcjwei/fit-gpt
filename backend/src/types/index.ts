import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Core Workout Types
// ============================================

export interface Workout {
  id: string; // UUID v4
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
  reps?: number;
  weight?: number;
  weightUnit: 'lbs' | 'kg';
  duration?: number; // Duration in seconds for time-based exercises (e.g., planks)
  rpe?: number; // Rate of perceived exertion (1-10)
  notes?: string;
}

/**
 * Helper function to determine if a set is completed
 * A set is considered completed if it has reps, weight, or duration filled in
 */
export const isSetCompleted = (set: SetInstance): boolean => {
  return (
    set.reps !== undefined ||
    set.weight !== undefined ||
    set.duration !== undefined
  );
};

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
  | 'traps'         // ADD: Important for deadlifts, shrugs, rows
  | 'lats'          // ADD: Specific back subdivision
  | 'rear-delts'    // ADD: Often trained separately from shoulders
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
  tags?: string[]; // Flexible for custom categorization (e.g., 'beginner-friendly', 'low-impact')
}