import { LLMService } from '../llm.service';
import type { ExerciseSearchService } from '../exerciseSearch.service';
import type { ExerciseCreationService } from '../exerciseCreation.service';
import type { ExerciseRepository } from '../../repositories/ExerciseRepository';
import { createWorkoutValidator } from './workoutValidator';
import { createIDExtractor } from './idExtractor';
import { createParser } from './parser';
import { createSyntaxFixer } from './syntaxFixer';
import { createDatabaseFormatter } from './databaseFormatter';
import { Workout } from '../../types';
import { AppError } from '../../middleware/errorHandler';

export interface OrchestratorOptions {
  date?: string;
  weightUnit?: 'lbs' | 'kg';
  userId?: string;
}

/**
 * Workout Parser Orchestrator
 * Coordinates the flexible workout parsing pipeline with independent modules:
 * 1. PreValidator: Validate it's workout content
 * 2. IDExtractor: Extract exercise names and map to IDs
 * 3. Parser: Parse structure with pre-mapped IDs
 * 4. SyntaxFixer: Validate/fix syntax issues
 * 5. DatabaseFormatter: Add UUIDs for final workout
 */
export function createOrchestrator(
  llmService: LLMService,
  searchService: ExerciseSearchService,
  creationService: ExerciseCreationService,
  exerciseRepository: ExerciseRepository
) {
  async function parse(workoutText: string, options: OrchestratorOptions = {}): Promise<Workout> {
    // Module 1: PreValidator - Validate workout content
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

    // Module 2: IDExtractor - Extract exercise names and map to slugs
    const idExtractor = createIDExtractor(llmService, searchService, creationService);
    const exerciseSlugMap = await idExtractor.extract(workoutText);

    // Module 3: Parser - Parse structure with pre-mapped slugs
    const parser = createParser(llmService);
    const parsedWorkout = await parser.parse(workoutText, exerciseSlugMap, {
      date: options.date,
      weightUnit: options.weightUnit,
    });

    // Module 4: SyntaxFixer - Validate/fix syntax issues
    const syntaxFixer = createSyntaxFixer(llmService);
    const syntacticallyFixedWorkout = await syntaxFixer.fix(workoutText, parsedWorkout);

    // Module 5: DatabaseFormatter - Convert slugs to IDs and add UUIDs
    const formatter = createDatabaseFormatter(exerciseRepository);
    const workout = await formatter.format(syntacticallyFixedWorkout);

    return workout;
  }

  return { parse };
}

export type Orchestrator = ReturnType<typeof createOrchestrator>;
