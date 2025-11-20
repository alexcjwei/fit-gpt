import { createExerciseSearchService, type ExerciseSearchService } from '../../../src/services/exerciseSearch.service';
import { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import { Exercise as ExerciseType } from '../../../src/types';
import { createMockExerciseRepository, createMockExercise } from '../../utils/mocks';

describe('ExerciseSearchService - Pure Function Tests', () => {
  let service: ExerciseSearchService;
  let mockRepository: jest.Mocked<ExerciseRepository>;

  const mockBarbellBench: ExerciseType = createMockExercise({
    id: '1',
    name: 'Barbell Bench Press',
    slug: 'barbell-bench-press',
    tags: ['chest', 'push', 'barbell'],
  });

  const mockDumbbellBench: ExerciseType = createMockExercise({
    id: '2',
    name: 'Dumbbell Bench Press',
    slug: 'dumbbell-bench-press',
    tags: ['chest', 'push', 'dumbbell'],
  });

  const mockCloseGripBarbellBench: ExerciseType = createMockExercise({
    id: '5',
    name: 'Close-Grip Barbell Bench Press',
    slug: 'close-grip-barbell-bench-press',
    tags: ['chest', 'triceps', 'push', 'barbell'],
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repository (not used in pure function tests, but needed for service creation)
    mockRepository = createMockExerciseRepository();

    service = createExerciseSearchService(mockRepository);
  });

  describe('scoreByToken', () => {
    it('should score exact match highest', () => {
      const score = service.scoreByToken('barbell bench press', 'Barbell Bench Press');

      // All 3 tokens match exactly: 3.0
      expect(score).toBe(3.0);
    });

    it('should score prefix match lower than exact match', () => {
      const score = service.scoreByToken('bench press', 'Barbell Bench Press');

      // 2 exact matches (bench, press), 1 extra token (barbell) = 2.0 - 0.1 = 1.9
      expect(score).toBeCloseTo(1.9, 1);
    });

    it('should penalize distractor tokens', () => {
      const score = service.scoreByToken('bench press', 'Close-Grip Barbell Bench Press');

      // 2 exact matches (bench, press), 3 extra tokens = 2.0 - 0.3 = 1.7
      expect(score).toBeCloseTo(1.7, 1);
    });

    it('should score based on overlapping tokens with penalty', () => {
      const benchScore = service.scoreByToken('bench press', 'Barbell Bench Press');
      const closeGripScore = service.scoreByToken('bench press', 'Close-Grip Barbell Bench Press');

      // Barbell Bench Press should score higher (fewer distractors)
      expect(benchScore).toBeGreaterThan(closeGripScore);
    });

    it('should handle case-insensitive matching', () => {
      const score1 = service.scoreByToken('bench press', 'Barbell Bench Press');
      const score2 = service.scoreByToken('BENCH PRESS', 'Barbell Bench Press');
      const score3 = service.scoreByToken('Bench Press', 'barbell bench press');

      expect(score1).toBe(score2);
      expect(score1).toBe(score3);
    });

    it('should return 0 for no matching tokens', () => {
      const score = service.scoreByToken('squat', 'Barbell Bench Press');

      // 0 matches, 3 extra tokens = 0 - 0.3 = -0.3, but minimum should be 0
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle normalized tokens (hyphens, special chars)', () => {
      const score = service.scoreByToken('t bar row', 'T-Bar Row');

      // Should normalize hyphens and match: 3 exact matches
      expect(score).toBe(3.0);
    });

    it('should expand abbreviations before scoring', () => {
      const score = service.scoreByToken('db bench press', 'Dumbbell Bench Press');

      // "db" expands to "dumbbell", so all 3 tokens match exactly
      expect(score).toBe(3.0);
    });
  });

  describe('rankByToken', () => {
    it('should re-rank results by token score', () => {
      const results = [
        { exercise: mockCloseGripBarbellBench, score: 0 },
        { exercise: mockBarbellBench, score: 0 },
        { exercise: mockDumbbellBench, score: 0 },
      ];

      const ranked = service.rankByToken('bench press', results);

      // Both "Barbell" and "Dumbbell" have same score (1.9), but Close-Grip should be last
      expect(ranked[0].exercise.name).toBe('Barbell Bench Press');
      expect(ranked[2].exercise.name).toBe('Close-Grip Barbell Bench Press');
      // Dumbbell and Barbell both score 1.9, order preserved from original
    });

    it('should update score field with token score', () => {
      const results = [
        { exercise: mockBarbellBench, score: 0 },
      ];

      const ranked = service.rankByToken('bench press', results);

      // Score should be updated to reflect token matching
      expect(ranked[0].score).toBeGreaterThan(0);
      expect(ranked[0].score).toBeCloseTo(1.9, 1);
    });

    it('should handle exact match', () => {
      const results = [
        { exercise: mockCloseGripBarbellBench, score: 0 },
        { exercise: mockBarbellBench, score: 0 },
      ];

      const ranked = service.rankByToken('barbell bench press', results);

      // Exact match should rank first
      expect(ranked[0].exercise.name).toBe('Barbell Bench Press');
      expect(ranked[0].score).toBe(3.0);
    });

    it('should preserve order when scores are equal', () => {
      const results = [
        { exercise: mockBarbellBench, score: 0 },
        { exercise: mockDumbbellBench, score: 0 },
      ];

      const ranked = service.rankByToken('overhead press', results);

      // Neither matches well, should preserve original order
      expect(ranked[0].exercise.id).toBe('1');
      expect(ranked[1].exercise.id).toBe('2');
    });

    it('should return empty array for empty input', () => {
      const ranked = service.rankByToken('bench press', []);

      expect(ranked).toEqual([]);
    });

    it('should handle single result', () => {
      const results = [{ exercise: mockBarbellBench, score: 0 }];

      const ranked = service.rankByToken('bench press', results);

      expect(ranked).toHaveLength(1);
      expect(ranked[0].exercise.name).toBe('Barbell Bench Press');
    });
  });
});
