import { LLMService } from '../llm.service';
import { ValidationResult, ValidationResultSchema } from '../../types';
import { AppError } from '../../middleware/errorHandler';

/**
 * Stage 0: Workout Validation Expert
 * Pre-validation step to verify that provided text is actually workout-related content
 */
export function createWorkoutValidator(llmService: LLMService) {
  async function validate(text: string): Promise<ValidationResult> {
    const systemPrompt = `You are a workout content validator. Your job is to determine if the provided text is workout-related content.

<instructions>
Analyze the input text and determine if it describes a fitness workout, exercise routine, training session, or similar physical activity plan.

Return a JSON object with this structure:
{
  "isWorkout": true|false,
  "confidence": 0.0-1.0,
  "reason": "Brief explanation if not a workout"
}

Valid workout content includes:
- Exercise lists with sets/reps
- Training programs
- Workout routines
- Warm-up/cool-down sequences
- Fitness class descriptions
- Athletic training plans

NOT valid workout content:
- Recipes or nutrition plans
- Random text
- Code or technical documentation
- Stories or narratives
- Other non-fitness content
</instructions>

Here's an example:

<example>
<input>
## Lower Body Strength + Power

**Warm Up / Activation**
- Light cardio: 5 min
- Glute bridges: 2x15

**Superset A (4 sets, 2-3 min rest)**
1. Back Squat or Trap Bar Deadlift: 6-8 reps
2. Box Jumps: 5 reps
</input>

<output>
{
  "isWorkout": true,
  "confidence": 1.0
}
</output>
</example>

Return ONLY valid JSON, no additional text.`;

    const userMessage = `Validate the following text:\n\n${text}`;

    const response = await llmService.call<ValidationResult>(
      systemPrompt,
      userMessage,
      'haiku', // Fast model for simple classification
      {
        temperature: 0,
        maxTokens: 200,
        jsonMode: true, // Force JSON output
      }
    );

    // Validate LLM response with Zod schema
    const validationResult = ValidationResultSchema.safeParse(response.content);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      throw new AppError(`LLM validation response parsing failed: ${errorMessage}`, 500);
    }

    return validationResult.data;
  }

  return { validate };
}

export type WorkoutValidator = ReturnType<typeof createWorkoutValidator>;
