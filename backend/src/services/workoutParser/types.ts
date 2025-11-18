import { Workout, WorkoutBlock, ExerciseInstance, SetInstance } from '../../types';

/**
 * Stage 1 output: Workout structure with exercise names as placeholders
 * The LLM outputs the workout in our database format, but with exercise names instead of IDs
 * Date and timestamp fields are added by the extractor, not from LLM
 */
export interface WorkoutWithPlaceholders
  extends Omit<Workout, 'id' | 'blocks' | 'date' | 'lastModifiedTime'> {
  blocks: WorkoutBlockWithPlaceholders[];
  date: string;
  lastModifiedTime: string;
}

export interface WorkoutBlockWithPlaceholders extends Omit<WorkoutBlock, 'id' | 'exercises'> {
  exercises: ExerciseInstanceWithPlaceholder[];
}

export interface ExerciseInstanceWithPlaceholder
  extends Omit<ExerciseInstance, 'id' | 'exerciseId' | 'sets'> {
  exerciseName: string; // The exercise name to be resolved to an ID in Stage 2
  sets: SetInstanceWithoutId[]; // Sets without UUIDs yet
}

export interface SetInstanceWithoutId extends Omit<SetInstance, 'id'> {}

/**
 * LLM response for a set - excludes fields that should be filled during workout
 * The LLM should not set reps, weight, or duration - these are filled by the user
 */
export interface SetInstanceFromLLM {
  setNumber: number;
  weightUnit: 'lbs' | 'kg';
  rpe?: number | null;
  notes?: string | null;
}

export interface ExerciseInstanceFromLLM extends Omit<ExerciseInstanceWithPlaceholder, 'sets'> {
  sets: SetInstanceFromLLM[];
}

export interface WorkoutBlockFromLLM extends Omit<WorkoutBlockWithPlaceholders, 'exercises'> {
  exercises: ExerciseInstanceFromLLM[];
}

export interface WorkoutFromLLM
  extends Omit<WorkoutWithPlaceholders, 'blocks' | 'date' | 'lastModifiedTime'> {
  blocks: WorkoutBlockFromLLM[];
}

/**
 * LLM response for Parser - has exerciseId instead of exerciseName (deprecated)
 */
export interface ExerciseInstanceFromLLMWithId {
  exerciseId: string;
  orderInBlock: number;
  prescription?: string;
  notes?: string;
  sets: SetInstanceFromLLM[];
}

export interface WorkoutBlockFromLLMWithId {
  label?: string;
  notes?: string;
  exercises: ExerciseInstanceFromLLMWithId[];
}

export interface WorkoutFromLLMWithId {
  name: string;
  notes?: string;
  blocks: WorkoutBlockFromLLMWithId[];
}

/**
 * LLM response for Parser - has exerciseSlug instead of exerciseName
 * This is the new format where LLM returns slugs which are then converted to IDs
 */
export interface ExerciseInstanceFromLLMWithSlug {
  exerciseSlug: string;
  orderInBlock: number;
  prescription?: string;
  notes?: string;
  sets: SetInstanceFromLLM[];
}

export interface WorkoutBlockFromLLMWithSlug {
  label?: string;
  notes?: string;
  exercises: ExerciseInstanceFromLLMWithSlug[];
}

export interface WorkoutFromLLMWithSlug {
  name: string;
  notes?: string;
  blocks: WorkoutBlockFromLLMWithSlug[];
}

/**
 * Stage 2 output: Workout structure with resolved exerciseIds
 * After Stage 2, exerciseName has been resolved to exerciseId
 */
export interface WorkoutWithResolvedExercises extends Omit<Workout, 'id' | 'blocks'> {
  blocks: WorkoutBlockWithResolvedExercises[];
}

export interface WorkoutBlockWithResolvedExercises extends Omit<WorkoutBlock, 'id' | 'exercises'> {
  exercises: ExerciseInstanceWithoutId[];
}

export interface ExerciseInstanceWithoutId extends Omit<ExerciseInstance, 'id' | 'sets'> {
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
  reason?: string; // Explanation
}
