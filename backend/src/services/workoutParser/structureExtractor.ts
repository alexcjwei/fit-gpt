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
    const systemPrompt = `You are a workout text parser.`
    
    const userMessage = `Your job is to convert unstructured workout text into a structured JSON format that matches our database schema.

Parse the following workout text:
<text>
${workoutText}
</text>

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
          "prescription": "formatted prescription string", // See detailed rules below
          "notes": "exercise-level notes"
        }
      ],
      "notes": "block-level notes"
    }
  ]
}

Key parsing rules:
- For "exerciseName": Use the commonly known name with equipment first, movement second (e.g., "Barbell Back Squat", "Dumbbell Bench Press").
- Notes and prescription: use to separate base exercise from instance-specific details
  - For example, "Hamstring PNF stretch: 3x hold-contract-relax each leg" -> Name "Hamstring PNF Stretch" with prescription "3 x 1 ea." and notes "hold-contract-relax each leg once per set"
  - For example, "Foam roll quads, adductors, IT band: 60 seconds each" -> Name "Foam roll" with prescription "60 secs. ea." and notes "quads, adductors, IT band"
- Parse notation like "2x15": Create 2 sets, each set with setNumber 1 and 2
- For unilateral exercises ("8/leg", "30 sec/side"): Create the appropriate number of sets
- If multiple options listed like "Exercise A or Exercise B": Choose the FIRST exercise only and put it in exerciseName. For example "Bike or row" -> "Bike"
- For supersets/circuits: Assume exercises in that block have the same number of sets (specified at block level like "4 sets") unless otherwise noted (i.e last exercise has fewer sets)
- Do NOT include reps, weight, or duration in the set objects - these will be filled in by the user during their workout

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
- "3 x 5 x 150 lbs - 185 lbs" = 3 sets of 5 reps, weight range 150-185 lbs
- "1 x 5 min" = 1 set of 5 minutes
- "5 min" = 5 minutes (time-based activity like warmup or cardio)
- "5 3 1" = 3 sets where 1st set is 5 reps, 2nd set is 3 reps, 3rd set is 1 rep (varying reps per set)

Rest time rules for prescription field:
- Include rest time ONLY for the last exercise in a superset/circuit block
- For standalone exercises, include rest time if specified
- Format rest as: (Rest X min), (Rest X sec), or (Rest X-Y min)
</instructions>

Example:
<example>
<text>
Lower Body Strength (Post-Match Modified)
WARM UP / ACTIVATION (8-10 mins)

Bike or row: 5 mins easy
90/90 hip switches: 8 each side
Glute bridges: 2x12 (BW, pause at top)
Goblet squat hold: 2x20 seconds (Light)
Single leg RDL: 2x6 each leg (BW, slow and controlled)


SUPERSET A (3 sets, 2-3 min rest between rounds)
A1: Trap Bar Deadlift - 3x6 @ Medium
A2: Single Leg Box Squat - 3x6 each leg @ BW or Light DB

SUPERSET B (3 sets, 90 sec rest)
B1: Bulgarian Split Squat - 3x8 each leg @ Light to Medium-Light
B2: Banded Terminal Knee Extensions - 3x15 each leg @ Medium resistance band

SUPERSET C (2 sets, minimal rest)
C1: Copenhagen Plank - 2x20 seconds each side
C2: Pallof Press - 2x12 each side @ Medium band
C3: Dead Bug - 2x10 each side

COOL DOWN (5-8 mins)

90/90 hip stretch: 90 seconds each side
Hamstring PNF stretch: 3x hold-contract-relax each leg
Foam roll quads, adductors, IT band: 60 seconds each
Couch stretch: 60 seconds each side
</text>

<output>
{
  "name": "Lower Body Strength (Post-Match Modified)",
  "notes": "",
  "blocks": [
    {
      "label": "Warm Up / Activation",
      "notes": "8-10 mins",
      "exercises": [
        {
          "exerciseName": "Bike",
          "orderInBlock": 0,
          "prescription": "1 x 5 min",
          "notes": "",
          "sets": [
            {
              "setNumber": 1,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": ""
            }
          ]
        },
        {
          "exerciseName": "90/90 hip switches",
          "orderInBlock": 1,
          "prescription": "1 x 8 ea.",
          "notes": "",
          "sets": [
            {
              "setNumber": 1,
              "weightUnit": "lbs",
              "rpe": null,
              "notes": ""
            }
          ]
        },
        {
          "exerciseName": "Glute bridges",
          "orderInBlock": 2,
          "prescription": "2 x 12",
          "notes": "BW, pause at top",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseName": "Goblet squat hold",
          "orderInBlock": 3,
          "prescription": "2 x 20 secs.",
          "notes": "Light",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseName": "Single leg RDL",
          "orderInBlock": 4,
          "prescription": "2 x 6 ea.",
          "notes": "BW, slow and controlled",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        }
      ]
    },
    {
      "label": "Superset A",
      "notes": "3 sets, 2-3 min rest between rounds",
      "exercises": [
        {
          "exerciseName": "Trap Bar Deadlift",
          "orderInBlock": 0,
          "prescription": "3 x 6",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 3, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseName": "Single Leg Box Squat",
          "orderInBlock": 1,
          "prescription": "3 x 6 ea. (Rest 2-3 min)",
          "notes": "BW or Light DB",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 3, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        }
      ]
    },
    {
      "label": "Superset B",
      "notes": "3 sets, 90 sec rest",
      "exercises": [
        {
          "exerciseName": "Bulgarian Split Squat",
          "orderInBlock": 0,
          "prescription": "3 x 8 ea.",
          "notes": "Light to Medium-Light",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 3, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseName": "Banded Terminal Knee Extensions",
          "orderInBlock": 1,
          "prescription": "3 x 15 ea. (Rest 90 secs.)",
          "notes": "Medium resistance band",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 3, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        }
      ]
    },
    {
      "label": "Superset C",
      "notes": "2 sets, minimal rest",
      "exercises": [
        {
          "exerciseName": "Copenhagen Plank",
          "orderInBlock": 0,
          "prescription": "2 x 20 secs. ea.",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseName": "Pallof Press",
          "orderInBlock": 1,
          "prescription": "2 x 12 ea.",
          "notes": "Medium band",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseName": "Dead Bug",
          "orderInBlock": 2,
          "prescription": "2 x 10 ea. (Rest minimal)",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        }
      ]
    },
    {
      "label": "Cool Down",
      "notes": "5-8 mins",
      "exercises": [
        {
          "exerciseName": "90/90 hip stretch",
          "orderInBlock": 0,
          "prescription": "1 x 90 secs. ea.",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseName": "Hamstring PNF stretch",
          "orderInBlock": 1,
          "prescription": "3 x hold-contract-relax ea.",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "lbs", "rpe": null, "notes": "" },
            { "setNumber": 3, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseName": "Foam roll",
          "orderInBlock": 2,
          "prescription": "1 x 60 secs. ea.",
          "notes": "quads, adductors, IT band",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseName": "Couch stretch",
          "orderInBlock": 3,
          "prescription": "1 x 60 secs. ea.",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "lbs", "rpe": null, "notes": "" }
          ]
        }
      ]
    }
  ]
}
</output>
</example>

<formatting>
Return ONLY valid JSON matching the structure above. No additional text or explanations.
</formatting>`;


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
