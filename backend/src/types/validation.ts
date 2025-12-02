import { z } from 'zod';
import type {
  Workout as DomainWorkout,
  WorkoutBlock as DomainWorkoutBlock,
  ExerciseInstance as DomainExerciseInstance,
  SetInstance as DomainSetInstance,
} from './domain';
import { sanitizeUserContent } from '../utils/sanitization';

// ============================================
// Auth Schemas
// ============================================

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .transform(sanitizeUserContent),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ============================================
// Set Schemas
// ============================================

export const SetInstanceSchema = z.object({
  id: z.string().uuid('Invalid set ID'),
  setNumber: z.number().int().positive('Set number must be positive'),
  reps: z.number().int().positive('Reps must be positive').nullable().optional(),
  weight: z.number().positive('Weight must be positive').nullable().optional(),
  weightUnit: z.enum(['lbs', 'kg'], { errorMap: () => ({ message: 'Weight unit must be lbs or kg' }) }),
  duration: z.number().int().positive('Duration must be positive').nullable().optional(),
  rpe: z.number().int().min(1, 'RPE must be between 1 and 10').max(10, 'RPE must be between 1 and 10').nullable().optional(),
  notes: z.string().transform(sanitizeUserContent).nullable().optional(),
});

export type SetInstance = z.infer<typeof SetInstanceSchema>;

export const CreateSetInstanceSchema = SetInstanceSchema.omit({ id: true }).strict();

export type CreateSetInstance = z.infer<typeof CreateSetInstanceSchema>;

export const UpdateSetInstanceSchema = SetInstanceSchema.omit({ id: true, setNumber: true }).partial();

export type UpdateSetInstance = z.infer<typeof UpdateSetInstanceSchema>;

// ============================================
// Exercise Instance Schemas
// ============================================

export const ExerciseInstanceSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().uuid('Invalid exercise instance ID'),
    exerciseId: z.string().min(1, 'Exercise ID is required'),
    orderInBlock: z.number().int().min(0, 'Order in block must be non-negative'),
    sets: z.array(SetInstanceSchema),
    prescription: z.string().transform(sanitizeUserContent).optional(),
    notes: z.string().transform(sanitizeUserContent).optional(),
  })
);

export type ExerciseInstance = z.infer<typeof ExerciseInstanceSchema>;

export const CreateExerciseInstanceSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    exerciseId: z.string().min(1, 'Exercise ID is required'),
    orderInBlock: z.number().int().min(0, 'Order in block must be non-negative'),
    sets: z.array(CreateSetInstanceSchema),
    prescription: z.string().transform(sanitizeUserContent).optional(),
    notes: z.string().transform(sanitizeUserContent).optional(),
  })
);

export type CreateExerciseInstance = z.infer<typeof CreateExerciseInstanceSchema>;

// ============================================
// Workout Block Schemas
// ============================================

export const WorkoutBlockSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().uuid('Invalid block ID'),
    label: z.string().transform(sanitizeUserContent).optional(),
    exercises: z.array(ExerciseInstanceSchema),
    notes: z.string().transform(sanitizeUserContent).optional(),
  })
);

export type WorkoutBlock = z.infer<typeof WorkoutBlockSchema>;

export const CreateWorkoutBlockSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    label: z.string().transform(sanitizeUserContent).optional(),
    exercises: z.array(CreateExerciseInstanceSchema).optional().default([]),
    notes: z.string().transform(sanitizeUserContent).optional(),
  })
);

export type CreateWorkoutBlock = z.infer<typeof CreateWorkoutBlockSchema>;

// ============================================
// Workout Schemas
// ============================================

// ISO date regex (YYYY-MM-DD)
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ISO 8601 timestamp regex
const isoTimestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

export const WorkoutSchema = z.object({
  id: z.string().min(1, 'Workout ID is required'),
  name: z.string().min(1, 'Workout name is required').transform(sanitizeUserContent),
  date: z.string().regex(isoDateRegex, 'Date must be in ISO format (YYYY-MM-DD)'),
  lastModifiedTime: z.string().regex(isoTimestampRegex, 'Last modified time must be in ISO 8601 format'),
  blocks: z.array(WorkoutBlockSchema),
  notes: z.string().transform(sanitizeUserContent).optional(),
});

export type Workout = z.infer<typeof WorkoutSchema>;

export const CreateWorkoutSchema = z.object({
  name: z.string().min(1, 'Workout name is required').transform(sanitizeUserContent),
  date: z.string().regex(isoDateRegex, 'Date must be in ISO format (YYYY-MM-DD)'),
  blocks: z.array(CreateWorkoutBlockSchema).optional().default([]),
  notes: z.string().transform(sanitizeUserContent).optional(),
}).strict();

export type CreateWorkout = z.infer<typeof CreateWorkoutSchema>;

export const UpdateWorkoutSchema = z.object({
  name: z.string().min(1, 'Workout name is required').transform(sanitizeUserContent).optional(),
  date: z.string().regex(isoDateRegex, 'Date must be in ISO format (YYYY-MM-DD)').optional(),
  notes: z.string().transform(sanitizeUserContent).optional(),
});

export type UpdateWorkout = z.infer<typeof UpdateWorkoutSchema>;

// ============================================
// Exercise Schemas
// ============================================

// Slug must be lowercase alphanumeric with hyphens
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ExerciseSchema = z.object({
  id: z.string().min(1, 'Exercise ID is required'),
  slug: z.string().regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1, 'Exercise name is required').transform(sanitizeUserContent),
  tags: z.array(z.string()).optional(),
  needsReview: z.boolean().optional(),
});

export type Exercise = z.infer<typeof ExerciseSchema>;

export const CreateExerciseSchema = ExerciseSchema.omit({ id: true }).strict();

export type CreateExercise = z.infer<typeof CreateExerciseSchema>;

export const UpdateExerciseSchema = ExerciseSchema.omit({ id: true }).partial();

export type UpdateExercise = z.infer<typeof UpdateExerciseSchema>;

// ============================================
// Filter and Pagination Schemas
// ============================================

export const PaginationOptionsSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1).max(100, 'Limit must be between 1 and 100').default(50),
});

export type PaginationOptions = z.infer<typeof PaginationOptionsSchema>;

export const WorkoutFiltersSchema = z.object({
  dateFrom: z.string().regex(isoDateRegex, 'dateFrom must be in ISO format (YYYY-MM-DD)').optional(),
  dateTo: z.string().regex(isoDateRegex, 'dateTo must be in ISO format (YYYY-MM-DD)').optional(),
});

export type WorkoutFilters = z.infer<typeof WorkoutFiltersSchema>;

export const ExerciseFiltersSchema = z.object({
  tag: z.string().optional(),
  search: z.string().optional(),
});

export type ExerciseFilters = z.infer<typeof ExerciseFiltersSchema>;

// ============================================
// LLM Parser Schemas
// ============================================

export const SetInstanceFromLLMSchema = z.object({
  setNumber: z.number().int().positive('Set number must be positive'),
  weightUnit: z.enum(['lbs', 'kg']),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().transform(sanitizeUserContent).nullable().optional(),
});

export type SetInstanceFromLLM = z.infer<typeof SetInstanceFromLLMSchema>;

export const ExerciseInstanceFromLLMSchema = z.object({
  exerciseName: z.string().min(1, 'Exercise name is required').transform(sanitizeUserContent),
  orderInBlock: z.number().int().min(0),
  sets: z.array(SetInstanceFromLLMSchema),
  prescription: z.string().transform(sanitizeUserContent).optional(),
  notes: z.string().transform(sanitizeUserContent).optional(),
});

export type ExerciseInstanceFromLLM = z.infer<typeof ExerciseInstanceFromLLMSchema>;

export const WorkoutBlockFromLLMSchema = z.object({
  label: z.string().transform(sanitizeUserContent).optional(),
  exercises: z.array(ExerciseInstanceFromLLMSchema),
  notes: z.string().transform(sanitizeUserContent).optional(),
});

export type WorkoutBlockFromLLM = z.infer<typeof WorkoutBlockFromLLMSchema>;

export const WorkoutFromLLMSchema = z.object({
  name: z.string().min(1, 'Workout name is required').transform(sanitizeUserContent),
  notes: z.string().transform(sanitizeUserContent).optional(),
  blocks: z.array(WorkoutBlockFromLLMSchema),
});

export type WorkoutFromLLM = z.infer<typeof WorkoutFromLLMSchema>;

// ============================================
// LLM Parser Schemas - Concise Format
// Optimized format that reduces LLM output tokens
// Server-side expansion adds orderInBlock, sets array, and weightUnit
// ============================================

export const ExerciseInstanceFromLLMConciseSchema = z.object({
  exerciseName: z.string().min(1, 'Exercise name is required').transform(sanitizeUserContent),
  numSets: z.number().int().positive('Number of sets must be positive'),
  prescription: z.string().transform(sanitizeUserContent).optional(),
  notes: z.string().transform(sanitizeUserContent).optional(),
});

export type ExerciseInstanceFromLLMConcise = z.infer<typeof ExerciseInstanceFromLLMConciseSchema>;

export const WorkoutBlockFromLLMConciseSchema = z.object({
  label: z.string().transform(sanitizeUserContent).optional(),
  exercises: z.array(ExerciseInstanceFromLLMConciseSchema),
  notes: z.string().transform(sanitizeUserContent).optional(),
});

export type WorkoutBlockFromLLMConcise = z.infer<typeof WorkoutBlockFromLLMConciseSchema>;

export const WorkoutFromLLMConciseSchema = z.object({
  name: z.string().min(1, 'Workout name is required').transform(sanitizeUserContent),
  notes: z.string().transform(sanitizeUserContent).optional(),
  blocks: z.array(WorkoutBlockFromLLMConciseSchema),
});

export type WorkoutFromLLMConcise = z.infer<typeof WorkoutFromLLMConciseSchema>;

// ============================================
// LLM Parser Schemas (With Exercise IDs)
// Used by Parser that receives pre-mapped exercise IDs
// ============================================

export const ExerciseInstanceFromLLMWithIdSchema = z.object({
  exerciseId: z.string().min(1, 'Exercise ID is required'),
  orderInBlock: z.number().int().min(0),
  sets: z.array(SetInstanceFromLLMSchema),
  prescription: z.string().transform(sanitizeUserContent).optional(),
  notes: z.string().transform(sanitizeUserContent).optional(),
});

export type ExerciseInstanceFromLLMWithId = z.infer<typeof ExerciseInstanceFromLLMWithIdSchema>;

export const WorkoutBlockFromLLMWithIdSchema = z.object({
  label: z.string().transform(sanitizeUserContent).optional(),
  exercises: z.array(ExerciseInstanceFromLLMWithIdSchema),
  notes: z.string().transform(sanitizeUserContent).optional(),
});

export type WorkoutBlockFromLLMWithId = z.infer<typeof WorkoutBlockFromLLMWithIdSchema>;

export const WorkoutFromLLMWithIdSchema = z.object({
  name: z.string().min(1, 'Workout name is required').transform(sanitizeUserContent),
  notes: z.string().transform(sanitizeUserContent).optional(),
  blocks: z.array(WorkoutBlockFromLLMWithIdSchema),
});

export type WorkoutFromLLMWithId = z.infer<typeof WorkoutFromLLMWithIdSchema>;

// ============================================
// Validation Result Schema
// ============================================

export const ValidationResultSchema = z.object({
  isWorkout: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().optional(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ============================================
// Workout Parser Types
// ============================================

/**
 * Stage 1 output: Workout structure with exercise names as placeholders
 * The LLM outputs the workout in our database format, but with exercise names instead of IDs
 * Date and timestamp fields are added by the extractor, not from LLM
 */
export interface WorkoutWithPlaceholders
  extends Omit<DomainWorkout, 'id' | 'blocks' | 'date' | 'lastModifiedTime'> {
  blocks: WorkoutBlockWithPlaceholders[];
  date: string;
  lastModifiedTime: string;
}

export interface WorkoutBlockWithPlaceholders extends Omit<DomainWorkoutBlock, 'id' | 'exercises'> {
  exercises: ExerciseInstanceWithPlaceholder[];
}

export interface ExerciseInstanceWithPlaceholder
  extends Omit<DomainExerciseInstance, 'id' | 'exerciseId' | 'sets'> {
  exerciseName: string; // The exercise name to be resolved to an ID in Stage 2
  sets: SetInstanceWithoutId[]; // Sets without UUIDs yet
}

export interface SetInstanceWithoutId extends Omit<DomainSetInstance, 'id'> {}

/**
 * LLM response for Parser - has exerciseSlug instead of exerciseName
 * LLM returns slugs which are then converted to IDs in DatabaseFormatter
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
export interface WorkoutWithResolvedExercises extends Omit<DomainWorkout, 'id' | 'blocks'> {
  blocks: WorkoutBlockWithResolvedExercises[];
}

export interface WorkoutBlockWithResolvedExercises extends Omit<DomainWorkoutBlock, 'id' | 'exercises'> {
  exercises: ExerciseInstanceWithoutId[];
}

export interface ExerciseInstanceWithoutId extends Omit<DomainExerciseInstance, 'id' | 'sets'> {
  sets: SetInstanceWithoutId[];
}

// ============================================
// Workout Parser Zod Schemas
// ============================================

export const SetInstanceWithoutIdSchema = z.object({
  setNumber: z.number().int().min(1),
  reps: z.null(),
  weight: z.null(),
  weightUnit: z.enum(['lbs', 'kg']),
  duration: z.null(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  notes: z.string().transform(sanitizeUserContent).nullable().optional(),
});

export const ExerciseInstanceWithoutIdSchema = z.object({
  exerciseId: z.string().min(1),
  orderInBlock: z.number().int().min(0),
  prescription: z.string().transform(sanitizeUserContent).optional(),
  notes: z.string().transform(sanitizeUserContent).optional(),
  sets: z.array(SetInstanceWithoutIdSchema).min(1),
});

export const WorkoutBlockWithResolvedExercisesSchema = z.object({
  label: z.string().transform(sanitizeUserContent).optional(),
  notes: z.string().transform(sanitizeUserContent).optional(),
  exercises: z.array(ExerciseInstanceWithoutIdSchema).min(1),
});

export const WorkoutWithResolvedExercisesSchema = z.object({
  name: z.string().min(1).transform(sanitizeUserContent),
  notes: z.string().transform(sanitizeUserContent).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  lastModifiedTime: z.string(), // ISO timestamp
  blocks: z.array(WorkoutBlockWithResolvedExercisesSchema).min(1),
});

// ============================================
// LLM Parser Schemas (With Exercise Slugs)
// Used by Parser that receives pre-mapped exercise slugs
// Slugs are converted to IDs in DatabaseFormatter
// ============================================

export const ExerciseInstanceFromLLMWithSlugSchema = z.object({
  exerciseSlug: z.string().min(1, 'Exercise slug is required'),
  orderInBlock: z.number().int().min(0),
  sets: z.array(SetInstanceFromLLMSchema),
  prescription: z.string().transform(sanitizeUserContent).optional(),
  notes: z.string().transform(sanitizeUserContent).optional(),
});

export const WorkoutBlockFromLLMWithSlugSchema = z.object({
  label: z.string().transform(sanitizeUserContent).optional(),
  exercises: z.array(ExerciseInstanceFromLLMWithSlugSchema),
  notes: z.string().transform(sanitizeUserContent).optional(),
});

export const WorkoutFromLLMWithSlugSchema = z.object({
  name: z.string().min(1, 'Workout name is required').transform(sanitizeUserContent),
  notes: z.string().transform(sanitizeUserContent).optional(),
  blocks: z.array(WorkoutBlockFromLLMWithSlugSchema),
});
