import { LLMService } from '../llm.service';
import { WorkoutWithPlaceholders } from './types';

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
              "targetRepsMin": minimum target reps,
              "targetRepsMax": maximum target reps,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs", // always "lbs" for now
              "targetDuration": duration in seconds (for time-based exercises),
              "actualDuration": null,
              "rpe": null,
              "notes": "set-specific notes if any"
            }
          ],
          "restPeriod": "exercise-specific rest period like '90 sec'",
          "notes": "exercise-level notes"
        }
      ],
      "restPeriod": "block-level rest period like '2-3 min'",
      "notes": "block-level notes"
    }
  ]
}

Key parsing rules:
1. For "exerciseName": Put as descriptive an exercise name as you can as a string (e.g., "Barbell Back Squat", "Dumbbell Bench Press"). Another system will resolve this to an actual ID later. Using fuzzy search.
2. Parse rep ranges: "6-8 reps" → targetRepsMin: 6, targetRepsMax: 8
3. Parse fixed reps: "15 reps" → targetRepsMin: 15, targetRepsMax: 15
4. Parse notation "2x15": Create 2 sets, each with targetRepsMin: 15, targetRepsMax: 15
5. Parse notation "3x8-10": Create 3 sets, each with targetRepsMin: 8, targetRepsMax: 10
6. Parse time: "45 sec" → targetDuration: 45, leave reps as null
7. For unilateral exercises ("8/leg", "30 sec/side"): Create sets with the specified reps/duration (no need to double)
8. If "Exercise A or Exercise B": Choose the FIRST exercise only and put it in exerciseName
9. Detect block types from headers: "Superset", "Circuit", "AMRAP", "EMOM", etc.
10. Extract rest periods from parentheses or descriptions
11. Preserve original exercise names exactly as written
12. For supersets/circuits: All exercises in that block have the same number of sets (specified at block level like "4 sets")
13. Always set actualReps: null, actualWeight: null, actualDuration: null for new workouts (these are filled in during the workout)
14. For circuits with "X rounds", each exercise should have X sets

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
              "targetRepsMin": null,
              "targetRepsMax": null,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs",
              "targetDuration": 300,
              "actualDuration": null,
              "rpe": null,
              "notes": null
            }
          ],
          "restPeriod": null,
          "notes": null
        },
        {
          "exerciseName": "Glute bridges",
          "orderInBlock": 1,
          "sets": [
            {
              "setNumber": 1,
              "targetRepsMin": 15,
              "targetRepsMax": 15,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs",
              "targetDuration": null,
              "actualDuration": null,
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 2,
              "targetRepsMin": 15,
              "targetRepsMax": 15,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs",
              "targetDuration": null,
              "actualDuration": null,
              "rpe": null,
              "notes": null
            }
          ],
          "restPeriod": null,
          "notes": null
        }
      ],
      "restPeriod": null,
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
              "targetRepsMin": 6,
              "targetRepsMax": 8,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs",
              "targetDuration": null,
              "actualDuration": null,
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 2,
              "targetRepsMin": 6,
              "targetRepsMax": 8,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs",
              "targetDuration": null,
              "actualDuration": null,
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 3,
              "targetRepsMin": 6,
              "targetRepsMax": 8,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs",
              "targetDuration": null,
              "actualDuration": null,
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 4,
              "targetRepsMin": 6,
              "targetRepsMax": 8,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs",
              "targetDuration": null,
              "actualDuration": null,
              "rpe": null,
              "notes": null
            }
          ],
          "restPeriod": null,
          "notes": null
        },
        {
          "exerciseName": "Box Jumps",
          "orderInBlock": 1,
          "sets": [
            {
              "setNumber": 1,
              "targetRepsMin": 5,
              "targetRepsMax": 5,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs",
              "targetDuration": null,
              "actualDuration": null,
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 2,
              "targetRepsMin": 5,
              "targetRepsMax": 5,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs",
              "targetDuration": null,
              "actualDuration": null,
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 3,
              "targetRepsMin": 5,
              "targetRepsMax": 5,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs",
              "targetDuration": null,
              "actualDuration": null,
              "rpe": null,
              "notes": null
            },
            {
              "setNumber": 4,
              "targetRepsMin": 5,
              "targetRepsMax": 5,
              "actualReps": null,
              "targetWeight": null,
              "actualWeight": null,
              "weightUnit": "lbs",
              "targetDuration": null,
              "actualDuration": null,
              "rpe": null,
              "notes": null
            }
          ],
          "restPeriod": null,
          "notes": null
        }
      ],
      "restPeriod": "2-3 min",
      "notes": null
    }
  ]
}
</output>

Return ONLY valid JSON matching the structure above. No additional text or explanations.`;

    const userMessage = `Parse the following workout text:\n\n${workoutText}`;

    const response = await this.llmService.call<Omit<WorkoutWithPlaceholders, 'date' | 'startTime' | 'lastModifiedTime'>>(
      systemPrompt,
      userMessage,
      'sonnet', // Use sonnet for better reasoning
      {
        temperature: 0.1,
        maxTokens: 8000,
        jsonMode: true, // Force JSON output
      }
    );

    // Add date and timestamp fields (not from LLM)
    return {
      ...response.content,
      date,
      startTime: undefined,
      lastModifiedTime: timestamp,
    };
  }
}
