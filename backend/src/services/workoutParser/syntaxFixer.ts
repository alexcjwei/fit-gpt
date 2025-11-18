import { LLMService } from '../llm.service';
import { WorkoutWithResolvedExercises, WorkoutWithResolvedExercisesSchema } from '../../types';

/**
 * Syntax Fixer Module
 * Validates and fixes syntax errors in parsed workouts using Zod schema validation
 * Ensures the workout object conforms to the schema
 */
export function createSyntaxFixer(llmService: LLMService) {
  const MAX_ITERATIONS = 3;

  /**
   * Fix syntax issues in the parsed workout
   * Uses validation loop to ensure schema compliance
   */
  async function fix(
    originalText: string,
    parsedWorkout: any
  ): Promise<WorkoutWithResolvedExercises> {
    let currentWorkout = parsedWorkout;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      const issues = validateSyntax(currentWorkout);

      if (issues.length === 0) {
        // No syntax issues found - validation passed
        break;
      }

      // Apply fixes using LLM
      currentWorkout = await applyFixes(originalText, currentWorkout, issues);
      iteration++;
    }

    return currentWorkout as WorkoutWithResolvedExercises;
  }

  /**
   * Validate the parsed workout using Zod schema
   * Returns array of syntax issues found
   */
  function validateSyntax(parsedWorkout: any): string[] {
    const result = WorkoutWithResolvedExercisesSchema.safeParse(parsedWorkout);

    if (result.success) {
      return [];
    }

    // Convert Zod errors to readable strings
    const issues = result.error.errors.map((err) => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });

    return issues;
  }

  /**
   * Apply fixes to resolve syntax issues using LLM
   */
  async function applyFixes(
    originalText: string,
    parsedWorkout: any,
    issues: string[]
  ): Promise<any> {
    const systemPrompt = `You are an expert fitness assistant that fixes syntax errors in parsed workouts.`;

    const userMessage = `Fix the syntax/schema issues in this parsed workout.

<original_text>
${originalText}
</original_text>

<parsed_workout>
${JSON.stringify(parsedWorkout, null, 2)}
</parsed_workout>

<identified_issues>
${issues.join('\n')}
</identified_issues>

<schema_requirements>
Required fields and types:
- name: string (required, non-empty)
- date: string (required, YYYY-MM-DD format)
- lastModifiedTime: string (required, ISO timestamp)
- blocks: array (required, at least one block)

Each block must have:
- exercises: array (required, at least one exercise)
- label: string (optional)
- notes: string (optional)

Each exercise must have:
- exerciseId: string (required, non-empty)
- orderInBlock: number (required, 0-indexed integer)
- sets: array (required, at least one set)
- prescription: string (optional)
- notes: string (optional)

Each set must have:
- setNumber: number (required, 1-indexed integer, NOT string)
- weightUnit: "lbs" or "kg" (required, must be exactly these strings)
- reps: null (always null)
- weight: null (always null)
- duration: null (always null)
- rpe: number between 1-10 or null (optional)
- notes: string or null (optional)
</schema_requirements>

<instructions>
Fix all the syntax/schema issues while preserving all data. Return the corrected workout as JSON.

Fixing rules:
- Add missing required fields with appropriate defaults:
  - name: derive from workout text or use "Workout"
  - date: use current date YYYY-MM-DD if missing
  - lastModifiedTime: use current ISO timestamp if missing
- Convert data types correctly:
  - setNumber: convert string "1" to number 1
  - orderInBlock: ensure it's a number
  - weightUnit: convert "pounds" to "lbs", "kilograms" to "kg"
- Ensure all required arrays have at least one element
- Keep reps, weight, duration as null (NOT undefined, NOT missing)
- Keep all exerciseId values exactly as they are (do NOT change IDs)
- Maintain the same structure

Return ONLY the corrected workout JSON, no other text.
</instructions>`;

    const response = await llmService.call<WorkoutWithResolvedExercises>(
      systemPrompt,
      userMessage,
      'sonnet',
      { jsonMode: true }
    );

    return response.content;
  }

  return { fix };
}

export type SyntaxFixer = ReturnType<typeof createSyntaxFixer>;
