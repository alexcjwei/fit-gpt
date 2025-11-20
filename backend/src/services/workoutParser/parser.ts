import { LLMService } from '../llm.service';
import {
  WorkoutWithResolvedExercises,
  WorkoutFromLLMWithSlug,
  WorkoutFromLLMWithSlugSchema,
} from '../../types';
import { ExerciseSlugMap } from './idExtractor';
import { AppError } from '../../middleware/errorHandler';

export interface ParserOptions {
  date?: string;
  weightUnit?: 'lbs' | 'kg';
}

/**
 * Parser Module
 * Parses raw workout text into structured format with pre-mapped exercise slugs
 * Outputs workout with slugs in exerciseId field (converted to IDs in DatabaseFormatter)
 */
export function createParser(llmService: LLMService) {
  async function parse(
    workoutText: string,
    exerciseSlugMap: ExerciseSlugMap,
    options: ParserOptions = {}
  ): Promise<WorkoutWithResolvedExercises> {
    const date = options.date ?? new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    const weightUnit = options.weightUnit ?? 'lbs';

    // Build the exercise mapping reference for the LLM
    const exerciseMappingText = Object.entries(exerciseSlugMap)
      .map(([name, slug]) => `"${name}" -> "${slug}"`)
      .join('\n');

    const systemPrompt = `You are a workout text parser.`;

    const userMessage = `Your job is to convert unstructured workout text into a structured JSON format that matches our database schema.

Parse the following workout text:
<text>
${workoutText}
</text>

<exercise_slug_mappings>
The following exercise names have been pre-mapped to exercise slugs. Use these slugs in the exerciseId field:
${exerciseMappingText}
</exercise_slug_mappings>

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
          "exerciseSlug": "USE_THE_MAPPED_SLUG_HERE", // Use the slug from the mapping above
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
- For "exerciseSlug": Match the exercise name in the text to the closest name in the exercise_slug_mappings, then use that slug
- Notes and prescription: use to separate base exercise from instance-specific details
  - For example, "Hamstring PNF stretch: 3x hold-contract-relax each leg" -> use slug for "Hamstring PNF Stretch" with prescription "3 x 1 ea." and notes "hold-contract-relax each leg once per set"
- Parse notation like "2x15": Create 2 sets, each set with setNumber 1 and 2
- Parse notation like "5-3-1": Create 3 sets, with prescription "5-3-1"
- For unilateral exercises ("8/leg", "30 sec/side"): Create the appropriate number of sets
- If multiple options listed like "Exercise A or Exercise B": Choose the FIRST exercise only
- Do NOT include reps, weight, or duration in the set objects - these will be filled in by the user during their workout
- All sets should use weightUnit: "${weightUnit}"
- Ignore any parts of the text which do not seem workout related

IMPORTANT - "prescription" field format:
The "prescription" field should be a concise, readable summary of the exercise prescription. Format: "Sets × Reps/Range/Duration @ Load (Rest)"

Examples of prescription formatting:
- "3 x 8" = 3 sets of 8 reps
- "3 x 8-10" = 3 sets of 8-10 reps
- "3 x 8 ea." = 3 sets of 8 reps each (for unilateral)
- "3 x 8 ea. (Rest 2 min)" = 3 sets of 8 reps each, rest 2 minutes between sets
- "3 x 20-30 secs. ea." = 3 sets of 20-30 seconds each
- "3 x AMAP" = 3 sets of as many as possible
- "4 sets" = 4 sets (when no rep/duration info)
- "3 x 5 @ 150 lbs" = 3 sets of 5 reps at 150 lbs
- "4×5 @ RPE 7 (Rest 2–3 min)" = 4 sets of 5 reps at 7 rate-of-perceived-exertion and 2-3 minutes rest between sets
- "1 x 5 min" = 1 set of 5 minutes
- "5 min" = 5 minutes (time-based activity)
- "5-3-1" = 3 sets where 1st set is 5 reps, 2nd set is 3 reps, 3rd set is 1 rep (varying reps per set)

Rest time rules for prescription field:
- Include rest time ONLY for the last exercise in a superset/circuit block
- For standalone exercises, include rest time if specified
- Format rest as: (Rest X min), (Rest X sec), or (Rest X-Y min)

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

<exercise_slug_mappings>
"Bike" -> "bike"
"90/90 hip switches" -> "90-90-hip-switches"
"Glute bridges" -> "glute-bridge"
"Goblet squat hold" -> "goblet-squat-hold"
"Single leg RDL" -> "single-leg-romanian-deadlift"
"Trap Bar Deadlift" -> "trap-bar-deadlift"
"Single Leg Box Squat" -> "single-leg-box-squat"
"Bulgarian Split Squat" -> "bulgarian-split-squat"
"Banded Terminal Knee Extensions" -> "banded-terminal-knee-extension"
"Copenhagen Plank" -> "copenhagen-plank"
"Pallof Press" -> "pallof-press"
"Dead Bug" -> "dead-bug"
"90/90 hip stretch" -> "90-90-hip-stretch"
"Hamstring PNF stretch" -> "hamstring-pnf-stretch"
"Foam roll" -> "foam-roll"
"Couch stretch" -> "couch-stretch"
</exercise_slug_mappings>

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
          "exerciseSlug": "bike",
          "orderInBlock": 0,
          "prescription": "1 x 5 min",
          "notes": "easy",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseSlug": "90-90-hip-switches",
          "orderInBlock": 1,
          "prescription": "1 x 8 ea.",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseSlug": "glute-bridge",
          "orderInBlock": 2,
          "prescription": "2 x 12",
          "notes": "BW, pause at top",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseSlug": "goblet-squat-hold",
          "orderInBlock": 3,
          "prescription": "2 x 20 secs.",
          "notes": "Light",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseSlug": "single-leg-romanian-deadlift",
          "orderInBlock": 4,
          "prescription": "2 x 6 ea.",
          "notes": "BW, slow and controlled",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        }
      ]
    },
    {
      "label": "Superset A",
      "notes": "3 sets, 2-3 min rest between rounds",
      "exercises": [
        {
          "exerciseSlug": "trap-bar-deadlift",
          "orderInBlock": 0,
          "prescription": "3 x 6",
          "notes": "Medium",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 3, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseSlug": "single-leg-box-squat",
          "orderInBlock": 1,
          "prescription": "3 x 6 ea. (Rest 2-3 min)",
          "notes": "BW or Light DB",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 3, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        }
      ]
    },
    {
      "label": "Superset B",
      "notes": "3 sets, 90 sec rest",
      "exercises": [
        {
          "exerciseSlug": "bulgarian-split-squat",
          "orderInBlock": 0,
          "prescription": "3 x 8 ea.",
          "notes": "Light to Medium-Light",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 3, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseSlug": "banded-terminal-knee-extension",
          "orderInBlock": 1,
          "prescription": "3 x 15 ea. (Rest 90 secs.)",
          "notes": "Medium resistance band",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 3, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        }
      ]
    },
    {
      "label": "Superset C",
      "notes": "2 sets, minimal rest",
      "exercises": [
        {
          "exerciseSlug": "copenhagen-plank",
          "orderInBlock": 0,
          "prescription": "2 x 20 secs. ea.",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseSlug": "pallof-press",
          "orderInBlock": 1,
          "prescription": "2 x 12 ea.",
          "notes": "Medium band",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseSlug": "dead-bug",
          "orderInBlock": 2,
          "prescription": "2 x 10 ea. (Rest minimal)",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        }
      ]
    },
    {
      "label": "Cool Down",
      "notes": "5-8 mins",
      "exercises": [
        {
          "exerciseSlug": "90-90-hip-stretch",
          "orderInBlock": 0,
          "prescription": "1 x 90 secs. ea.",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseSlug": "hamstring-pnf-stretch",
          "orderInBlock": 1,
          "prescription": "3 x hold-contract-relax ea.",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 2, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" },
            { "setNumber": 3, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseSlug": "foam-roll",
          "orderInBlock": 2,
          "prescription": "1 x 60 secs. ea.",
          "notes": "quads, adductors, IT band",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        },
        {
          "exerciseSlug": "couch-stretch",
          "orderInBlock": 3,
          "prescription": "1 x 60 secs. ea.",
          "notes": "",
          "sets": [
            { "setNumber": 1, "weightUnit": "${weightUnit}", "rpe": null, "notes": "" }
          ]
        }
      ]
    }
  ]
}
</output>
</example>
</instructions>

Return ONLY the JSON object, no other text.`;

    const response = await llmService.call<WorkoutFromLLMWithSlug>(
      systemPrompt,
      userMessage,
      'sonnet',
      { jsonMode: true, maxTokens: 8000, temperature: 0 }
    );

    // Validate LLM response with Zod schema
    const validationResult = WorkoutFromLLMWithSlugSchema.safeParse(response.content);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new AppError(`Parser LLM response validation failed: ${errorMessage}`, 500);
    }

    const workoutFromLLM = validationResult.data;

    // Transform WorkoutFromLLM to WorkoutWithResolvedExercises
    // Keep slugs in exerciseId field - they will be converted to IDs in DatabaseFormatter
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
          exerciseId: exercise.exerciseSlug, // Keep slug here, convert to ID in DatabaseFormatter
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

  return { parse };
}

export type Parser = ReturnType<typeof createParser>;
