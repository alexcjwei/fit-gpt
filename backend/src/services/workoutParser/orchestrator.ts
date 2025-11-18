import { LLMService } from '../llm.service';
import { ExerciseSearchService } from '../exerciseSearch.service';
import { WorkoutValidator } from './workoutValidator';
import { IDExtractor } from './idExtractor';
import { Parser } from './parser';
import { SemanticFixer } from './semanticFixer';
import { SyntaxFixer } from './syntaxFixer';
import { DatabaseFormatter } from './databaseFormatter';
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
 * 4. SemanticFixer: Validate/fix semantic issues
 * 5. SyntaxFixer: Validate/fix syntax issues
 * 6. DatabaseFormatter: Add UUIDs for final workout
 */
export class Orchestrator {
  private llmService: LLMService;
  private searchService: ExerciseSearchService;

  constructor(llmService?: LLMService, searchService?: ExerciseSearchService) {
    this.llmService = llmService ?? new LLMService();
    this.searchService = searchService ?? new ExerciseSearchService();
  }

  async parse(workoutText: string, options: OrchestratorOptions = {}): Promise<Workout> {
    // Module 1: PreValidator - Validate workout content
    const validator = new WorkoutValidator(this.llmService);
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

    // Module 2: IDExtractor - Extract exercise names and map to IDs
    const idExtractor = new IDExtractor(this.llmService, this.searchService);
    const exerciseIdMap = await idExtractor.extract(workoutText);

    // Module 3: Parser - Parse structure with pre-mapped IDs
    const parser = new Parser(this.llmService);
    const parsedWorkout = await parser.parse(workoutText, exerciseIdMap, {
      date: options.date,
      weightUnit: options.weightUnit,
    });

    // Module 4: SemanticFixer - Validate/fix semantic issues
    const semanticFixer = new SemanticFixer(this.llmService);
    const semanticallyFixedWorkout = await semanticFixer.fix(workoutText, parsedWorkout);

    // Module 5: SyntaxFixer - Validate/fix syntax issues
    const syntaxFixer = new SyntaxFixer(this.llmService);
    const syntacticallyFixedWorkout = await syntaxFixer.fix(workoutText, semanticallyFixedWorkout);

    // Module 6: DatabaseFormatter - Add UUIDs
    const formatter = new DatabaseFormatter();
    const workout = formatter.format(syntacticallyFixedWorkout);

    return workout;
  }
}
