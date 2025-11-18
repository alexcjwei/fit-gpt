import { LLMService } from '../llm.service';
import type { ExerciseSearchService } from '../exerciseSearch.service';
import type { ExerciseCreationService } from '../exerciseCreation.service';
import type { ExerciseRepository } from '../../repositories/ExerciseRepository';
import { createWorkoutValidator } from './workoutValidator';
import { createStructureExtractor } from './structureExtractor';
import { createAiExerciseResolver } from './aiExerciseResolver';
import { createDatabaseFormatter } from './databaseFormatter';
import { Workout } from '../../types';
import { AppError } from '../../middleware/errorHandler';

export interface WorkoutParserOptions {
  date?: string;
  weightUnit?: 'lbs' | 'kg';
  userId?: string;
}

/**
 * Workout Parser Service
 * Orchestrates all stages of workout parsing:
 * - Stage 0: Validation (verify it's workout content)
 * - Stage 1: Structure Extraction (parse text into workout structure with exerciseName placeholders)
 * - Stage 2: Exercise Resolution (resolve exerciseName to exerciseId using fuzzy search)
 * - Stage 3: Database Formatting (add UUIDs)
 */
export function createWorkoutParserService(
  llmService: LLMService,
  searchService: ExerciseSearchService,
  creationService: ExerciseCreationService,
  exerciseRepository: ExerciseRepository
) {
  async function parse(workoutText: string, options: WorkoutParserOptions = {}): Promise<Workout> {
    // Stage 0: Validate workout content
    const validator = createWorkoutValidator(llmService);
    const validationResult = await validator.validate(workoutText);

    if (!validationResult.isWorkout) {
      throw new AppError(
        `The provided text does not appear to be workout content. ${validationResult.reason}`,
        400
      );
    }

    if (validationResult.confidence < 0.7) {
      throw new AppError(
        'Unable to confidently determine if this is workout content. Please provide clearer workout information.',
        400
      );
    }

    // Prepare date and timestamp for Stage 1
    const date = options.date ?? new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    // Stage 1: Extract structure (LLM outputs workout in our database format)
    const structureExtractor = createStructureExtractor(llmService);
    const workoutWithPlaceholders = await structureExtractor.extract(workoutText, date, timestamp);

    // Stage 2: Resolve exercise names to IDs using AI-powered hybrid search
    const exerciseResolver = createAiExerciseResolver(searchService, llmService, creationService);
    const resolvedWorkout = await exerciseResolver.resolve(workoutWithPlaceholders, options.userId);

    // Stage 3: Add UUIDs
    const formatter = createDatabaseFormatter(exerciseRepository);
    const workout = await formatter.format(resolvedWorkout);

    return workout;
  }

  return { parse };
}

export type WorkoutParserService = ReturnType<typeof createWorkoutParserService>;
