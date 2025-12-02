import { createParser, type Parser } from '../../../src/services/workoutParser/parser';
import { createMockLLMService } from '../../utils/mocks';
import { LLMService } from '../../../src/services/llm.service';

describe('Parser - Concise Schema Expansion', () => {
  let parser: Parser;
  let mockLLMService: jest.Mocked<LLMService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLLMService = createMockLLMService();
    parser = createParser(mockLLMService);
  });

  describe('parse', () => {
    it('should expand numSets into correct number of set objects', async () => {
      const workoutText = 'Squat 3x5';

      // Mock LLM response with concise schema
      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          name: 'Test Workout',
          blocks: [
            {
              label: 'Main',
              exercises: [
                {
                  exerciseName: 'Squat',
                  numSets: 3,
                  prescription: '3 x 5',
                },
              ],
            },
          ],
        },
        raw: {} as any,
      });

      const result = await parser.parse(workoutText, { weightUnit: 'lbs' });

      expect(result.blocks[0].exercises[0].sets).toHaveLength(3);
      expect(result.blocks[0].exercises[0].sets[0].setNumber).toBe(1);
      expect(result.blocks[0].exercises[0].sets[1].setNumber).toBe(2);
      expect(result.blocks[0].exercises[0].sets[2].setNumber).toBe(3);
    });

    it('should add orderInBlock from array index', async () => {
      const workoutText = 'Squat 3x5, Bench 3x8';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          name: 'Test Workout',
          blocks: [
            {
              label: 'Main',
              exercises: [
                {
                  exerciseName: 'Squat',
                  numSets: 3,
                  prescription: '3 x 5',
                },
                {
                  exerciseName: 'Bench Press',
                  numSets: 3,
                  prescription: '3 x 8',
                },
              ],
            },
          ],
        },
        raw: {} as any,
      });

      const result = await parser.parse(workoutText, { weightUnit: 'lbs' });

      expect(result.blocks[0].exercises[0].orderInBlock).toBe(0);
      expect(result.blocks[0].exercises[1].orderInBlock).toBe(1);
    });

    it('should add weightUnit from options to all sets', async () => {
      const workoutText = 'Squat 2x5';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          name: 'Test Workout',
          blocks: [
            {
              label: 'Main',
              exercises: [
                {
                  exerciseName: 'Squat',
                  numSets: 2,
                  prescription: '2 x 5',
                },
              ],
            },
          ],
        },
        raw: {} as any,
      });

      const result = await parser.parse(workoutText, { weightUnit: 'kg' });

      expect(result.blocks[0].exercises[0].sets[0].weightUnit).toBe('kg');
      expect(result.blocks[0].exercises[0].sets[1].weightUnit).toBe('kg');
    });

    it('should default weightUnit to lbs when not specified', async () => {
      const workoutText = 'Squat 2x5';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          name: 'Test Workout',
          blocks: [
            {
              label: 'Main',
              exercises: [
                {
                  exerciseName: 'Squat',
                  numSets: 2,
                  prescription: '2 x 5',
                },
              ],
            },
          ],
        },
        raw: {} as any,
      });

      const result = await parser.parse(workoutText);

      expect(result.blocks[0].exercises[0].sets[0].weightUnit).toBe('lbs');
      expect(result.blocks[0].exercises[0].sets[1].weightUnit).toBe('lbs');
    });

    it('should add default empty notes when omitted by LLM', async () => {
      const workoutText = 'Squat 2x5';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          name: 'Test Workout',
          blocks: [
            {
              label: 'Main',
              exercises: [
                {
                  exerciseName: 'Squat',
                  numSets: 2,
                  prescription: '2 x 5',
                  // notes omitted
                },
              ],
            },
          ],
        },
        raw: {} as any,
      });

      const result = await parser.parse(workoutText);

      expect(result.blocks[0].exercises[0].notes).toBe('');
    });

    it('should preserve notes when provided by LLM', async () => {
      const workoutText = 'Squat 2x5';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          name: 'Test Workout',
          blocks: [
            {
              label: 'Main',
              exercises: [
                {
                  exerciseName: 'Squat',
                  numSets: 2,
                  prescription: '2 x 5',
                  notes: 'Pause at bottom',
                },
              ],
            },
          ],
        },
        raw: {} as any,
      });

      const result = await parser.parse(workoutText);

      expect(result.blocks[0].exercises[0].notes).toBe('Pause at bottom');
    });

    it('should handle varying numSets across exercises', async () => {
      const workoutText = 'Squat 5 sets, Bench 3 sets, Plank 1 set';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          name: 'Test Workout',
          blocks: [
            {
              label: 'Main',
              exercises: [
                {
                  exerciseName: 'Squat',
                  numSets: 5,
                  prescription: '5-3-1-1-1',
                },
                {
                  exerciseName: 'Bench Press',
                  numSets: 3,
                  prescription: '3 x 8',
                },
                {
                  exerciseName: 'Plank',
                  numSets: 1,
                  prescription: '1 x 60 secs.',
                },
              ],
            },
          ],
        },
        raw: {} as any,
      });

      const result = await parser.parse(workoutText);

      expect(result.blocks[0].exercises[0].sets).toHaveLength(5);
      expect(result.blocks[0].exercises[1].sets).toHaveLength(3);
      expect(result.blocks[0].exercises[2].sets).toHaveLength(1);
    });

    it('should initialize all set fields to null except setNumber and weightUnit', async () => {
      const workoutText = 'Squat 1x5';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          name: 'Test Workout',
          blocks: [
            {
              label: 'Main',
              exercises: [
                {
                  exerciseName: 'Squat',
                  numSets: 1,
                  prescription: '1 x 5',
                },
              ],
            },
          ],
        },
        raw: {} as any,
      });

      const result = await parser.parse(workoutText);

      const set = result.blocks[0].exercises[0].sets[0];
      expect(set.setNumber).toBe(1);
      expect(set.weightUnit).toBe('lbs');
      expect(set.reps).toBeNull();
      expect(set.weight).toBeNull();
      expect(set.duration).toBeNull();
      expect(set.rpe).toBeNull();
      expect(set.notes).toBe('');
    });

    it('should handle empty blocks and notes fields with defaults', async () => {
      const workoutText = 'Squat 2x5';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          name: 'Test Workout',
          // notes omitted
          blocks: [
            {
              // label omitted
              exercises: [
                {
                  exerciseName: 'Squat',
                  numSets: 2,
                  prescription: '2 x 5',
                },
              ],
              // notes omitted
            },
          ],
        },
        raw: {} as any,
      });

      const result = await parser.parse(workoutText);

      expect(result.notes).toBe('');
      expect(result.blocks[0].label).toBe('');
      expect(result.blocks[0].notes).toBe('');
    });

    it('should handle multiple blocks with different exercises', async () => {
      const workoutText = 'Warmup: Jog 5min. Main: Squat 3x5, Bench 3x8';

      mockLLMService.call = jest.fn().mockResolvedValue({
        content: {
          name: 'Test Workout',
          blocks: [
            {
              label: 'Warmup',
              exercises: [
                {
                  exerciseName: 'Jogging',
                  numSets: 1,
                  prescription: '1 x 5 min',
                },
              ],
            },
            {
              label: 'Main',
              exercises: [
                {
                  exerciseName: 'Squat',
                  numSets: 3,
                  prescription: '3 x 5',
                },
                {
                  exerciseName: 'Bench Press',
                  numSets: 3,
                  prescription: '3 x 8',
                },
              ],
            },
          ],
        },
        raw: {} as any,
      });

      const result = await parser.parse(workoutText);

      expect(result.blocks).toHaveLength(2);

      // Warmup block
      expect(result.blocks[0].label).toBe('Warmup');
      expect(result.blocks[0].exercises).toHaveLength(1);
      expect(result.blocks[0].exercises[0].orderInBlock).toBe(0);
      expect(result.blocks[0].exercises[0].sets).toHaveLength(1);

      // Main block
      expect(result.blocks[1].label).toBe('Main');
      expect(result.blocks[1].exercises).toHaveLength(2);
      expect(result.blocks[1].exercises[0].orderInBlock).toBe(0);
      expect(result.blocks[1].exercises[1].orderInBlock).toBe(1);
      expect(result.blocks[1].exercises[0].sets).toHaveLength(3);
      expect(result.blocks[1].exercises[1].sets).toHaveLength(3);
    });
  });
});
