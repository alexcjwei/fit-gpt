import { LLMService } from '../llm.service';
import { WorkoutWithPlaceholders, WorkoutFromLLM } from './types';

/**
 * Stage 1: Structure Extraction Agent
 * Parse raw text into workout structure matching our database schema
 * Exercise IDs are populated with exercise names (placeholders) to be resolved in Stage 2
 */
export class StructureExtractor {
  constructor(private llmService: LLMService) {}

  async extract(
    workoutText: string,
    date: string,
    timestamp: string
  ): Promise<WorkoutWithPlaceholders> {
    const systemPrompt = `You are a workout text parser. Your job is to convert unstructured workout text into a structured JSON format that matches our database schema.

Parse the workout text and return a JSON object matching this TypeScript interface:

{
  "name": "workout name from the text",
  "notes": "any workout-level notes from the text",
  "blocks": [
    {
      "label": "section name like 'Warm Up', 'Superset A', etc.",
      "exercises": [
        {
          "exerciseName": "EXERCISE NAME HERE", // Put the full exercise name as a string
          "orderInBlock": 0, // 0-indexed position in the block
          "sets": [
            {
              "setNumber": 1, // 1-indexed set number
              "weightUnit": "lbs", // always "lbs" for now
              "rpe": null,
              "notes": "set-specific notes if any"
            }
          ],
          "instruction": "formatted instruction string", // See detailed rules below
          "notes": "exercise-level notes"
        }
      ],
      "notes": "block-level notes"
    }
  ]
}

Key parsing rules:
1. For "exerciseName": Put as descriptive an exercise name as you can as a string (e.g., "Barbell Back Squat", "Dumbbell Bench Press"). Another system will resolve this to an actual ID later using fuzzy search.
2. Parse notation "2x15": Create 2 sets, each set with setNumber 1 and 2
3. Parse notation "3x8-10": Create 3 sets
4. For unilateral exercises ("8/leg", "30 sec/side"): Create the appropriate number of sets
5. If "Exercise A or Exercise B": Choose the FIRST exercise only and put it in exerciseName
6. Detect block types from headers: "Superset", "Circuit", "AMRAP", "EMOM", etc.
7. Preserve original exercise names exactly as written
8. For supersets/circuits: All exercises in that block have the same number of sets (specified at block level like "4 sets")
9. For circuits with "X rounds", each exercise should have X sets
10. Do NOT include reps, weight, or duration in the set objects - these will be filled in by the user during their workout

CRITICAL - "instruction" field format:
The "instruction" field should be a concise, readable summary of the exercise prescription. Format: "Sets x Reps/Range/Duration x Weight (Rest time)"

Examples of instruction formatting:
- "3 x 8" = 3 sets of 8 reps
- "3 x 8-10" = 3 sets of 8-10 reps
- "3 x 8 ea." = 3 sets of 8 reps each (for unilateral)
- "3 x 8 ea. (Rest 2 min)" = 3 sets of 8 reps each, rest 2 minutes between sets
- "3 x 20-30 secs. ea." = 3 sets of 20-30 seconds each
- "3 x AMAP" = 3 sets of as many as possible
- "4 sets" = 4 sets (when no rep/duration info)
- "3 x 5 x 150 lbs" = 3 sets of 5 reps at 150 lbs
- "3 x 5 x 150 lbs - 185 lbs" = 3 sets of 5 reps, weight range 150-185 lbs
- "1 x 5 min" = 1 set of 5 minutes
- "5 min" = 5 minutes (time-based activity like warmup or cardio)
- "5 3 1" = 3 sets where 1st set is 5 reps, 2nd set is 3 reps, 3rd set is 1 rep (varying reps per set)

Rest time rules for instruction field:
- Include rest time ONLY for the last exercise in a superset/circuit block
- For standalone exercises, include rest time if specified
- Format rest as: (Rest X min), (Rest X sec), or (Rest X-Y min)

Example:
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
  "name": "Lower Body Strength + Power",
  "notes": null,
  "blocks": [
    {
      "label": "Warm Up / Activation",
      "exercises": [
        {
          "exerciseName": "Light cardio",
          "orderInBlock": 0,
          "sets": [
            {
              "setNumber": 1,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": null
            }
          ],
          "instruction": "1 x 5 min",
          "notes": null
        },
        {
          "exerciseName": "Glute bridges",
          "orderInBlock": 1,
          "sets": [
            {
              "setNumber": 1,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 2,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": null
            }
          ],
          "instruction": "2 x 15",
          "notes": null
        }
      ],
      "notes": null
    },
    {
      "label": "Superset A",
      "exercises": [
        {
          "exerciseName": "Back Squat",
          "orderInBlock": 0,
          "sets": [
            {
              "setNumber": 1,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 2,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 3,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 4,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": null
            }
          ],
          "instruction": "4 x 6-8",
          "notes": null
        },
        {
          "exerciseName": "Box Jumps",
          "orderInBlock": 1,
          "sets": [
            {
              "setNumber": 1,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 2,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 3,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 4,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": null
            }
          ],
          "instruction": "4 x 5 (Rest 2-3 min)",
          "notes": null
        }
      ],
      "notes": null
    }
  ]
}
</output>

Return ONLY valid JSON matching the structure above. No additional text or explanations.`;

    const userMessage = `Parse the following workout text:\n\n${workoutText}`;

    const response = await this.llmService.call<WorkoutFromLLM>(
      systemPrompt,
      userMessage,
      'sonnet', // Use sonnet for better reasoning
      {
        temperature: 0.1,
        maxTokens: 8000,
        jsonMode: true, // Force JSON output
      }
    );

    // Transform LLM response to WorkoutWithPlaceholders by adding user-filled fields
    // The LLM should NOT set reps, weight, or duration - we set them to null here
    const workoutWithPlaceholders: WorkoutWithPlaceholders = {
      ...response.content,
      date,
      lastModifiedTime: timestamp,
      blocks: response.content.blocks.map((block) => ({
        ...block,
        exercises: block.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) => ({
            ...set,
            reps: null,
            weight: null,
            duration: null,
          })),
        })),
      })),
    };

    return workoutWithPlaceholders;
  }
}
