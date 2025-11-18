import { z } from 'zod';

/**
 * Zod schemas for workout validation
 * These match the TypeScript types in types/index.ts
 */

export const SetInstanceWithoutIdSchema = z.object({
  setNumber: z.number().int().min(1),
  reps: z.null(),
  weight: z.null(),
  weightUnit: z.enum(['lbs', 'kg']),
  duration: z.null(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const ExerciseInstanceWithoutIdSchema = z.object({
  exerciseId: z.string().min(1),
  orderInBlock: z.number().int().min(0),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  sets: z.array(SetInstanceWithoutIdSchema).min(1),
});

export const WorkoutBlockWithResolvedExercisesSchema = z.object({
  label: z.string().optional(),
  notes: z.string().optional(),
  exercises: z.array(ExerciseInstanceWithoutIdSchema).min(1),
});

export const WorkoutWithResolvedExercisesSchema = z.object({
  name: z.string().min(1),
  notes: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  lastModifiedTime: z.string(), // ISO timestamp
  blocks: z.array(WorkoutBlockWithResolvedExercisesSchema).min(1),
});
