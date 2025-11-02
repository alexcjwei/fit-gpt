import { WorkoutValidator } from '../../../src/services/workoutParser/workoutValidator';
import { LLMService } from '../../../src/services/llm.service';

describe('WorkoutValidator - Integration Test', () => {
  let validator: WorkoutValidator;
  let llmService: LLMService;

  beforeAll(() => {
    // Initialize real services (no mocking)
    llmService = new LLMService();
    validator = new WorkoutValidator(llmService);
  });

  it('should return true for valid workout content', async () => {
    const validWorkoutText = `
## Lower Body Strength + Power

**Warm Up / Activation**
- Light cardio: 5 min
- Glute bridges: 2x15
- Leg swings: 10 each side

**Superset A (4 sets, 2-3 min rest)**
1. Back Squat: 6-8 reps
2. Box Jumps: 5 reps

**Superset B (3 sets, 2 min rest)**
1. Romanian Deadlift: 8-10 reps
2. Single Leg Box Step-ups: 8 each leg

**Finisher**
- Sled push: 4x20m
    `.trim();

    const result = await validator.validate(validWorkoutText);

    // Verify the AI correctly identifies this as a workout
    expect(result.isWorkout).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8); // High confidence expected
    // Note: AI may include optional reason field even for valid workouts
  }, 60000); // 60 second timeout for AI call

  it('should return false for non-workout content', async () => {
    const nonWorkoutText = `
# Chocolate Chip Cookie Recipe

## Ingredients
- 2 1/4 cups all-purpose flour
- 1 tsp baking soda
- 1 tsp salt
- 1 cup butter, softened
- 3/4 cup granulated sugar
- 3/4 cup packed brown sugar
- 2 large eggs
- 2 tsp vanilla extract
- 2 cups chocolate chips

## Instructions
1. Preheat oven to 375°F (190°C)
2. Mix flour, baking soda, and salt in a bowl
3. Beat butter and sugars until creamy
4. Add eggs and vanilla, beat well
5. Gradually stir in flour mixture
6. Fold in chocolate chips
7. Drop rounded tablespoons onto ungreased cookie sheets
8. Bake 9-11 minutes or until golden brown
9. Cool on baking sheet for 2 minutes
10. Remove to wire rack to cool completely

Enjoy with a glass of milk!
    `.trim();

    const result = await validator.validate(nonWorkoutText);

    // Verify the AI correctly identifies this as NOT a workout
    expect(result.isWorkout).toBe(false);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8); // High confidence expected
    expect(result.reason).toBeDefined(); // Should provide a reason
    expect(result.reason).toBeTruthy();
  }, 60000); // 60 second timeout for AI call
});
