import { LLMService } from '../llm.service';
import { WorkoutWithResolvedExercises, WorkoutFromLLMWithId } from './types';
import { ExerciseIdMap } from './idExtractor';

export interface ParserOptions {
  date?: string;
  weightUnit?: 'lbs' | 'kg';
}

/**
 * Parser Module
 * Parses raw workout text into structured format with pre-mapped exercise IDs
 * This is the refactored version of StructureExtractor that accepts exercise ID mappings
 */
export class Parser {
  constructor(private llmService: LLMService) {}

  async parse(
    workoutText: string,
    exerciseIdMap: ExerciseIdMap,
    options: ParserOptions = {}
  ): Promise<WorkoutWithResolvedExercises> {
    const date = options.date ?? new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    const weightUnit = options.weightUnit ?? 'lbs';

    // Build the exercise mapping reference for the LLM
    const exerciseMappingText = Object.entries(exerciseIdMap)
      .map(([name, id]) => `"${name}" -> ${id}`)
      .join('\n');

    const systemPrompt = `You are a workout text parser.`;

    const userMessage = `Your job is to convert unstructured workout text into a structured JSON format that matches our database schema.

Parse the following workout text:
<text>
${workoutText}
</text>

<exercise_id_mappings>
The following exercise names have been pre-mapped to database IDs. Use these IDs in the exerciseId field:
${exerciseMappingText}
</exercise_id_mappings>

<instructions>
Parse the workout text and return a JSON object matching this TypeScript interface:

{
  "name": "workout name from the text",
  "notes": "any workout-level notes from the text",
  "blocks": [
    {
      "label": "section name like 'Warm Up', 'Superset A', etc.",
      "exercises": [
        {
          "exerciseId": "USE_THE_MAPPED_ID_HERE", // Use the ID from the mapping above
          "orderInBlock": 0, // 0-indexed position in the block
          "sets": [
            {
              "setNumber": 1, // 1-indexed set number
              "weightUnit": "${weightUnit}",
              "rpe": null,
              "notes": "set-specific notes if any"
            }
          ],
          "prescription": "formatted prescription string", // See detailed rules below
          "notes": "exercise-level notes"
        }
      ],
      "notes": "block-level notes"
    }
  ]
}

Key parsing rules:
- For "exerciseId": Match the exercise name in the text to the closest name in the exercise_id_mappings, then use that ID
- Notes and prescription: use to separate base exercise from instance-specific details
  - For example, "Hamstring PNF stretch: 3x hold-contract-relax each leg" -> use ID for "Hamstring PNF Stretch" with prescription "3 x 1 ea." and notes "hold-contract-relax each leg once per set"
- Parse notation like "2x15": Create 2 sets, each set with setNumber 1 and 2
- For unilateral exercises ("8/leg", "30 sec/side"): Create the appropriate number of sets
- If multiple options listed like "Exercise A or Exercise B": Choose the FIRST exercise only
- For supersets/circuits: Assume exercises in that block have the same number of sets unless otherwise noted
- Do NOT include reps, weight, or duration in the set objects - these will be filled in by the user during their workout
- All sets should use weightUnit: "${weightUnit}"

IMPORTANT - "prescription" field format:
The "prescription" field should be a concise, readable summary of the exercise prescription. Format: "Sets x Reps/Range/Duration x Weight (Rest time)"

Examples of prescription formatting:
- "3 x 8" = 3 sets of 8 reps
- "3 x 8-10" = 3 sets of 8-10 reps
- "3 x 8 ea." = 3 sets of 8 reps each (for unilateral)
- "3 x 8 ea. (Rest 2 min)" = 3 sets of 8 reps each, rest 2 minutes between sets
- "3 x 20-30 secs. ea." = 3 sets of 20-30 seconds each
- "3 x AMAP" = 3 sets of as many as possible
- "4 sets" = 4 sets (when no rep/duration info)
- "3 x 5 x 150 lbs" = 3 sets of 5 reps at 150 lbs
- "1 x 5 min" = 1 set of 5 minutes
- "5 min" = 5 minutes (time-based activity)
- "5 3 1" = 3 sets where 1st set is 5 reps, 2nd set is 3 reps, 3rd set is 1 rep (varying reps per set)

Rest time rules for prescription field:
- Include rest time ONLY for the last exercise in a superset/circuit block
- For standalone exercises, include rest time if specified
- Format rest as: (Rest X min), (Rest X sec), or (Rest X-Y min)
</instructions>

Return ONLY the JSON object, no other text.`;

    const response = await this.llmService.call<WorkoutFromLLMWithId>(
      systemPrompt,
      userMessage,
      'sonnet',
      { jsonMode: true, maxTokens: 8000, temperature: 0.1 }
    );

    const workoutFromLLM = response.content;

    // Transform WorkoutFromLLM to WorkoutWithResolvedExercises
    // Need to add reps, weight, duration as null to the sets
    const workout: WorkoutWithResolvedExercises = {
      name: workoutFromLLM.name,
      notes: workoutFromLLM.notes,
      date,
      lastModifiedTime: timestamp,
      blocks: workoutFromLLM.blocks.map((block) => ({
        label: block.label,
        notes: block.notes,
        exercises: block.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          orderInBlock: exercise.orderInBlock,
          prescription: exercise.prescription,
          notes: exercise.notes,
          sets: exercise.sets.map((set) => ({
            setNumber: set.setNumber,
            reps: null,
            weight: null,
            weightUnit: set.weightUnit,
            duration: null,
            rpe: set.rpe,
            notes: set.notes,
          })),
        })),
      })),
    };

    return workout;
  }
}
