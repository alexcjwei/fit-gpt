import {
  Workout,
  WorkoutBlock,
  ExerciseInstance,
  SetInstance,
} from '../../types';

/**
 * Stage 1 output: Workout structure with exercise names as placeholders
 * The LLM outputs the workout in our database format, but with exercise names instead of IDs
 * Date and timestamp fields are added by the extractor, not from LLM
 */
export interface WorkoutWithPlaceholders
  extends Omit<Workout, 'id' | 'blocks' | 'date' | 'startTime' | 'lastModifiedTime'> {
  blocks: WorkoutBlockWithPlaceholders[];
  date: string;
  startTime?: string;
  lastModifiedTime: string;
}

export interface WorkoutBlockWithPlaceholders
  extends Omit<WorkoutBlock, 'id' | 'exercises'> {
  exercises: ExerciseInstanceWithPlaceholder[];
}

export interface ExerciseInstanceWithPlaceholder
  extends Omit<ExerciseInstance, 'id' | 'exerciseId' | 'sets'> {
  exerciseName: string; // The exercise name to be resolved to an ID in Stage 2
  sets: SetInstanceWithoutId[]; // Sets without UUIDs yet
}

export interface SetInstanceWithoutId extends Omit<SetInstance, 'id'> {}

/**
 * Stage 2 output: Workout structure with resolved exerciseIds
 * After Stage 2, exerciseName has been resolved to exerciseId
 */
export interface WorkoutWithResolvedExercises
  extends Omit<Workout, 'id' | 'blocks'> {
  blocks: WorkoutBlockWithResolvedExercises[];
}

export interface WorkoutBlockWithResolvedExercises
  extends Omit<WorkoutBlock, 'id' | 'exercises'> {
  exercises: ExerciseInstanceWithoutId[];
}

export interface ExerciseInstanceWithoutId
  extends Omit<ExerciseInstance, 'id' | 'sets'> {
  sets: SetInstanceWithoutId[];
}

/**
 * Stage 3 output: Final workout with all UUIDs assigned
 * This is the complete Workout object ready to save to database
 */
export type FormattedWorkout = Workout;

/**
 * Validation result from Stage 0
 */
export interface ValidationResult {
  isWorkout: boolean;
  confidence: number; // 0-1 scale
  reason?: string; // Explanation if not a workout
}
