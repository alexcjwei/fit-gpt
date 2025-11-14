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
});
