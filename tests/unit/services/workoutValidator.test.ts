import { WorkoutValidator } from '../../../src/services/workoutParser/workoutValidator';
import { LLMService } from '../../../src/services/llm.service';

// Mock the LLMService
jest.mock('../../../src/services/llm.service');

const MockedLLMService = LLMService as jest.MockedClass<typeof LLMService>;

describe('WorkoutValidator', () => {
  let validator: WorkoutValidator;
  let mockLLMService: jest.Mocked<LLMService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLLMService = new MockedLLMService() as jest.Mocked<LLMService>;
    validator = new WorkoutValidator(mockLLMService);
  });

  describe('validate', () => {
    it('should return valid workout with high confidence', async () => {
      const workoutText = `
## Lower Body Strength + Power

**Warm Up / Activation**
- Light cardio: 5 min
- Glute bridges: 2x15

**Superset A (4 sets, 2-3 min rest)**
1. Back Squat: 6-8 reps
2. Box Jumps: 5 reps
      `;

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          isWorkout: true,
          confidence: 1.0,
        },
        raw: {} as any,
      });

      const result = await validator.validate(workoutText);

      expect(result.isWorkout).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(mockLLMService.call).toHaveBeenCalledWith(
        expect.stringContaining('workout content validator'),
        expect.stringContaining(workoutText),
        'haiku',
        expect.objectContaining({
          temperature: 0,
          maxTokens: 200,
        })
      );
    });

    it('should return invalid for non-workout content', async () => {
      const nonWorkoutText = `
This is a recipe for chocolate chip cookies.
Ingredients: flour, sugar, butter, eggs, chocolate chips.
Mix everything together and bake at 350°F for 12 minutes.
      `;

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          isWorkout: false,
          confidence: 0.95,
          reason: 'This appears to be a recipe, not a workout routine',
        },
        raw: {} as any,
      });

      const result = await validator.validate(nonWorkoutText);

      expect(result.isWorkout).toBe(false);
      expect(result.confidence).toBe(0.95);
      expect(result.reason).toBe(
        'This appears to be a recipe, not a workout routine'
      );
    });

    it('should return low confidence for ambiguous content', async () => {
      const ambiguousText = `
Just some random text that doesn't really mean anything.
      `;

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          isWorkout: false,
          confidence: 0.3,
          reason: 'Content is too ambiguous to determine',
        },
        raw: {} as any,
      });

      const result = await validator.validate(ambiguousText);

      expect(result.isWorkout).toBe(false);
      expect(result.confidence).toBe(0.3);
    });

    it('should handle fitness class descriptions as valid workouts', async () => {
      const classDescription = `
HIIT Class - 45 minutes
- Warm up: 5 min
- Circuit 1: Burpees, Jump squats, Mountain climbers (3 rounds)
- Circuit 2: Kettlebell swings, Push-ups, Plank (3 rounds)
- Cool down: 5 min
      `;

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          isWorkout: true,
          confidence: 0.95,
        },
        raw: {} as any,
      });

      const result = await validator.validate(classDescription);

      expect(result.isWorkout).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should reject code/technical documentation', async () => {
      const codeText = `
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
      `;

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          isWorkout: false,
          confidence: 0.99,
          reason: 'This is code/technical documentation',
        },
        raw: {} as any,
      });

      const result = await validator.validate(codeText);

      expect(result.isWorkout).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should use haiku model with temperature 0', async () => {
      const workoutText = 'Push-ups: 3x10';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          isWorkout: true,
          confidence: 0.9,
        },
        raw: {} as any,
      });

      await validator.validate(workoutText);

      expect(mockLLMService.call).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'haiku',
        {
          temperature: 0,
          maxTokens: 200,
        }
      );
    });
  });
});
