import { LLMService } from '../llm.service';
import { WorkoutWithResolvedExercises } from '../../types';

/**
 * Semantic Fixer Module
 * Validates and fixes semantic errors in parsed workouts
 * Compares parsed workout against original text to ensure correctness
 */
export function createSemanticFixer(llmService: LLMService) {
  const MAX_ITERATIONS = 3;

  /**
   * Fix semantic issues in the parsed workout by comparing against original text
   * Uses validation loop to ensure all semantic issues are resolved
   */
  async function fix(
    originalText: string,
    parsedWorkout: WorkoutWithResolvedExercises
  ): Promise<WorkoutWithResolvedExercises> {
    let currentWorkout = parsedWorkout;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      const issues = await validateSemantics(originalText, currentWorkout);

      if (issues.length === 0) {
        // No semantic issues found
        break;
      }

      // Apply fixes
      currentWorkout = await applyFixes(originalText, currentWorkout, issues);
      iteration++;
    }

    return currentWorkout;
  }

  /**
   * Validate the parsed workout for semantic correctness
   * Returns array of semantic issues found
   */
  async function validateSemantics(
    originalText: string,
    parsedWorkout: WorkoutWithResolvedExercises
  ): Promise<string[]> {
    const systemPrompt = `You are an expert fitness assistant that validates workout parsing for semantic correctness.`;

    const userMessage = `Compare the original workout text with the parsed workout structure and identify any semantic errors.

<original_text>
${originalText}
</original_text>

<parsed_workout>
${JSON.stringify(parsedWorkout, null, 2)}
</parsed_workout>

<instructions>
Identify semantic errors such as:
- Incorrect number of sets (e.g., original says "3x10" but parsed has 10 sets)
- Mismatched set counts in supersets (e.g., exercises in same superset have different set counts)
- Incorrect rep counts or ranges
- Missing exercises that were mentioned
- Exercises in wrong order or wrong block
- Incorrect prescription format

Do NOT flag:
- Missing reps/weight/duration in sets (these are intentionally null for user to fill in)
- Minor formatting differences in notes or labels
- Variations in exercise naming (those have already been resolved)

Return format: {"issues": ["Issue 1 description", "Issue 2 description", ...]}
If no issues found, return: {"issues": []}
</instructions>`;

    const response = await llmService.call<{ issues: string[] }>(
      systemPrompt,
      userMessage,
      'haiku',
      { jsonMode: true }
    );

    return response.content.issues || [];
  }

  /**
   * Apply fixes to resolve semantic issues
   */
  async function applyFixes(
    originalText: string,
    parsedWorkout: WorkoutWithResolvedExercises,
    issues: string[]
  ): Promise<WorkoutWithResolvedExercises> {
    const systemPrompt = `You are an expert fitness assistant that fixes semantic errors in parsed workouts.`;

    const userMessage = `Fix the semantic issues in this parsed workout by referring to the original text.

<original_text>
${originalText}
</original_text>

<parsed_workout>
${JSON.stringify(parsedWorkout, null, 2)}
</parsed_workout>

<identified_issues>
${issues.join('\n')}
</identified_issues>

<instructions>
Fix the semantic issues while preserving the structure. Return the corrected workout as JSON.

Important rules:
- Keep all exerciseId values exactly as they are (do NOT change IDs)
- Keep reps, weight, duration as null in sets (user fills these in)
- Fix set counts, prescription formats, exercise order, etc. based on original text
- Maintain the same JSON structure as the input

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

export type SemanticFixer = ReturnType<typeof createSemanticFixer>;
