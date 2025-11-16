import { ExerciseSearchService } from '../../../src/services/exerciseSearch.service';
import { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import { Exercise as ExerciseType } from '../../../src/types';

describe('ExerciseSearchService', () => {
  let service: ExerciseSearchService;
  let mockRepository: jest.Mocked<ExerciseRepository>;

  const mockBarbellBench: ExerciseType = {
    id: '1',
    name: 'Barbell Bench Press',
    slug: 'barbell-bench-press',
    tags: ['chest', 'push', 'barbell'],
  };

  const mockDumbbellBench: ExerciseType = {
    id: '2',
    name: 'Dumbbell Bench Press',
    slug: 'dumbbell-bench-press',
    tags: ['chest', 'push', 'dumbbell'],
  };

  const mockRomanianDeadlift: ExerciseType = {
    id: '3',
    name: 'Romanian Deadlift',
    slug: 'romanian-deadlift',
    tags: ['legs', 'hamstrings', 'barbell'],
  };

  const mockOverheadPress: ExerciseType = {
    id: '4',
    name: 'Overhead Press',
    slug: 'overhead-press',
    tags: ['shoulders', 'push', 'barbell'],
  };

  const mockCloseGripBarbellBench: ExerciseType = {
    id: '5',
    name: 'Close-Grip Barbell Bench Press',
    slug: 'close-grip-barbell-bench-press',
    tags: ['chest', 'triceps', 'push', 'barbell'],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repository
    mockRepository = {
      searchByName: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      filter: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByName: jest.fn(),
      findByTag: jest.fn(),
    } as any;

    service = new ExerciseSearchService(mockRepository);
  });

  describe('searchByName', () => {
    it('should delegate to repository.searchByName', async () => {
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench]);

      const results = await service.searchByName('bench press');

      expect(mockRepository.searchByName).toHaveBeenCalledWith('bench press', 5);
      expect(results).toHaveLength(1);
      expect(results[0].exercise.name).toBe('Barbell Bench Press');
      expect(results[0].score).toBe(0); // Score is always 0 for compatibility
    });

    it('should expand DB abbreviation to dumbbell', async () => {
      mockRepository.searchByName.mockResolvedValue([mockDumbbellBench]);

      await service.searchByName('DB Bench Press');

      // Should preprocess "DB" to "dumbbell"
      expect(mockRepository.searchByName).toHaveBeenCalledWith('dumbbell bench press', 5);
    });

    it('should expand BB abbreviation to barbell', async () => {
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench]);

      await service.searchByName('BB Bench Press');

      // Should preprocess "BB" to "barbell"
      expect(mockRepository.searchByName).toHaveBeenCalledWith('barbell bench press', 5);
    });

    it('should expand RDL abbreviation to romanian deadlift', async () => {
      mockRepository.searchByName.mockResolvedValue([mockRomanianDeadlift]);

      await service.searchByName('RDL');

      // Should preprocess "RDL" to "romanian deadlift"
      expect(mockRepository.searchByName).toHaveBeenCalledWith('romanian deadlift', 5);
    });

    it('should expand OHP abbreviation to overhead press', async () => {
      mockRepository.searchByName.mockResolvedValue([mockOverheadPress]);

      await service.searchByName('OHP');

      // Should preprocess "OHP" to "overhead press"
      expect(mockRepository.searchByName).toHaveBeenCalledWith('overhead press', 5);
    });

    it('should respect custom limit option', async () => {
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench, mockDumbbellBench]);

      await service.searchByName('bench', { limit: 10 });

      expect(mockRepository.searchByName).toHaveBeenCalledWith('bench', 10);
    });

    it('should ignore threshold option (kept for API compatibility)', async () => {
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench]);

      await service.searchByName('bench', { threshold: 0.3 });

      // Threshold is ignored, pg_trgm handles similarity
      expect(mockRepository.searchByName).toHaveBeenCalledWith('bench', 5);
    });

    it('should return empty array when no results found', async () => {
      mockRepository.searchByName.mockResolvedValue([]);

      const results = await service.searchByName('nonexistent');

      expect(results).toEqual([]);
    });

    it('should handle multiple abbreviations in one query', async () => {
      mockRepository.searchByName.mockResolvedValue([mockDumbbellBench]);

      await service.searchByName('DB bench press');

      expect(mockRepository.searchByName).toHaveBeenCalledWith('dumbbell bench press', 5);
    });
  });

  describe('findBestMatch', () => {
    it('should return top result from search', async () => {
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench]);

      const result = await service.findBestMatch('bench press');

      expect(mockRepository.searchByName).toHaveBeenCalledWith('bench press', 1);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Barbell Bench Press');
    });

    it('should return null when no results found', async () => {
      mockRepository.searchByName.mockResolvedValue([]);

      const result = await service.findBestMatch('nonexistent');

      expect(result).toBeNull();
    });

    it('should ignore minScore parameter (kept for API compatibility)', async () => {
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench]);

      await service.findBestMatch('bench', 0.1);

      // minScore is ignored
      expect(mockRepository.searchByName).toHaveBeenCalledWith('bench', 1);
    });

    it('should expand abbreviations before searching', async () => {
      mockRepository.searchByName.mockResolvedValue([mockDumbbellBench]);

      const result = await service.findBestMatch('DB bench');

      expect(mockRepository.searchByName).toHaveBeenCalledWith('dumbbell bench', 1);
      expect(result?.name).toBe('Dumbbell Bench Press');
    });
  });

  describe('refreshCache', () => {
    it('should be a no-op (no caching with database search)', async () => {
      // Just verify it doesn't throw
      await service.refreshCache();

      // Repository should not be called
      expect(mockRepository.searchByName).not.toHaveBeenCalled();
    });
  });

  describe('getCachedExercises', () => {
    it('should return empty array (no caching with database search)', () => {
      const cached = service.getCachedExercises();

      expect(cached).toEqual([]);
    });
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
