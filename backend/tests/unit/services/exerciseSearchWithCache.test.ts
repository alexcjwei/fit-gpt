import { createExerciseSearchService, type ExerciseSearchService } from '../../../src/services/exerciseSearch.service';
import { createExerciseCacheService, type ExerciseCacheService } from '../../../src/services/exerciseCache.service';
import { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import { Exercise as ExerciseType } from '../../../src/types';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('ExerciseSearchService with Cache Integration', () => {
  let searchService: ExerciseSearchService;
  let cacheService: ExerciseCacheService;
  let mockRedisClient: jest.Mocked<Redis>;
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      mset: jest.fn(),
      del: jest.fn(),
      flushdb: jest.fn(),
    } as any;

    // Create mock repository
    mockRepository = {
      searchByName: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByTag: jest.fn(),
      checkDuplicateName: jest.fn(),
      existsById: jest.fn(),
      existsBySlug: jest.fn(),
    } as any;

    // Create cache service
    cacheService = createExerciseCacheService(mockRedisClient, mockRepository);

    // Create search service with cache support
    searchService = createExerciseSearchService(mockRepository, cacheService);
  });

  describe('searchByName with cache', () => {
    it('should check cache first before querying database', async () => {
      // Setup: cache returns exercise ID
      mockRedisClient.get.mockResolvedValue('1');
      mockRepository.findById.mockResolvedValue(mockBarbellBench);

      const results = await searchService.searchByName('Barbell Bench Press');

      // Verify cache was checked with normalized name
      expect(mockRedisClient.get).toHaveBeenCalledWith('exercise:name:barbell_bench_press');

      // Verify repository.findById was called with cached ID
      expect(mockRepository.findById).toHaveBeenCalledWith('1');

      // Verify searchByName was NOT called (cache hit)
      expect(mockRepository.searchByName).not.toHaveBeenCalled();

      // Verify correct result
      expect(results).toHaveLength(1);
      expect(results[0].exercise.name).toBe('Barbell Bench Press');
    });

    it('should query database on cache miss and populate cache', async () => {
      // Setup: cache miss
      mockRedisClient.get.mockResolvedValue(null);
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench]);
      mockRedisClient.set.mockResolvedValue('OK');

      const results = await searchService.searchByName('Barbell Bench Press');

      // Verify cache was checked first
      expect(mockRedisClient.get).toHaveBeenCalledWith('exercise:name:barbell_bench_press');

      // Verify database search was performed
      expect(mockRepository.searchByName).toHaveBeenCalledWith('barbell bench press', 5);

      // Verify cache was populated with result
      expect(mockRedisClient.set).toHaveBeenCalledWith('exercise:name:barbell_bench_press', '1');

      // Verify correct result
      expect(results).toHaveLength(1);
      expect(results[0].exercise.name).toBe('Barbell Bench Press');
    });

    it('should handle cache errors gracefully and fall back to database', async () => {
      // Setup: cache throws error
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench]);

      const results = await searchService.searchByName('Barbell Bench Press');

      // Verify cache was attempted
      expect(mockRedisClient.get).toHaveBeenCalled();

      // Verify database search was performed as fallback
      expect(mockRepository.searchByName).toHaveBeenCalledWith('barbell bench press', 5);

      // Verify correct result
      expect(results).toHaveLength(1);
      expect(results[0].exercise.name).toBe('Barbell Bench Press');
    });

    it('should work without cache service (graceful degradation)', async () => {
      // Create search service WITHOUT cache
      const searchServiceNoCache = createExerciseSearchService(mockRepository);
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench]);

      const results = await searchServiceNoCache.searchByName('Barbell Bench Press');

      // Verify database search was performed directly
      expect(mockRepository.searchByName).toHaveBeenCalledWith('barbell bench press', 5);

      // Verify correct result
      expect(results).toHaveLength(1);
      expect(results[0].exercise.name).toBe('Barbell Bench Press');
    });

    it('should populate cache only when single exact result found', async () => {
      // Setup: cache miss, single result
      mockRedisClient.get.mockResolvedValue(null);
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench]);
      mockRedisClient.set.mockResolvedValue('OK');

      await searchService.searchByName('Barbell Bench Press');

      // Should populate cache
      expect(mockRedisClient.set).toHaveBeenCalledWith('exercise:name:barbell_bench_press', '1');
    });

    it('should NOT populate cache when multiple results found', async () => {
      // Setup: cache miss, multiple results
      mockRedisClient.get.mockResolvedValue(null);
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench, mockDumbbellBench]);
      mockRedisClient.set.mockResolvedValue('OK');

      await searchService.searchByName('Bench Press');

      // Should NOT populate cache (ambiguous query)
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should NOT populate cache when no results found', async () => {
      // Setup: cache miss, no results
      mockRedisClient.get.mockResolvedValue(null);
      mockRepository.searchByName.mockResolvedValue([]);
      mockRedisClient.set.mockResolvedValue('OK');

      await searchService.searchByName('Nonexistent Exercise');

      // Should NOT populate cache
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should handle cache population errors gracefully', async () => {
      // Setup: cache miss, set fails
      mockRedisClient.get.mockResolvedValue(null);
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench]);
      mockRedisClient.set.mockRejectedValue(new Error('Redis write failed'));

      // Should not throw
      const results = await searchService.searchByName('Barbell Bench Press');

      // Verify correct result despite cache error
      expect(results).toHaveLength(1);
      expect(results[0].exercise.name).toBe('Barbell Bench Press');
    });
  });

  describe('findBestMatch with cache', () => {
    it('should check cache first for exact match', async () => {
      mockRedisClient.get.mockResolvedValue('1');
      mockRepository.findById.mockResolvedValue(mockBarbellBench);

      const result = await searchService.findBestMatch('Barbell Bench Press');

      expect(mockRedisClient.get).toHaveBeenCalledWith('exercise:name:barbell_bench_press');
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
      expect(result?.name).toBe('Barbell Bench Press');
    });

    it('should fall back to database search on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRepository.searchByName.mockResolvedValue([mockBarbellBench]);
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await searchService.findBestMatch('Barbell Bench Press');

      expect(mockRepository.searchByName).toHaveBeenCalledWith('barbell bench press', 1);
      expect(result?.name).toBe('Barbell Bench Press');
      expect(mockRedisClient.set).toHaveBeenCalledWith('exercise:name:barbell_bench_press', '1');
    });
  });
});
