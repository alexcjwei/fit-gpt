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
  duration?: number; // Duration in seconds for time-based exercises (e.g., planks)
  rpe?: number; // Rate of perceived exertion (1-10)
  completed: boolean;
  completedAt?: string; // ISO 8601 timestamp
  notes?: string;
}

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