import { createExerciseCacheService, type ExerciseCacheService } from '../../../src/services/exerciseCache.service';
import { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('ExerciseCacheService', () => {
  let service: ExerciseCacheService;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockRepository: jest.Mocked<ExerciseRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      mset: jest.fn(),
      del: jest.fn(),
      flushdb: jest.fn(),
      keys: jest.fn(),
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
      findAllWithEmbeddings: jest.fn(),
      searchBySemantic: jest.fn(),
    } as any;

    service = createExerciseCacheService(mockRedisClient, mockRepository);
  });

  describe('getNormalizedName', () => {
    it('should normalize exercise name to lowercase with underscores', () => {
      const normalized = service.getNormalizedName('Barbell Bench Press');
      expect(normalized).toBe('barbell_bench_press');
    });

    it('should replace hyphens with underscores', () => {
      const normalized = service.getNormalizedName('Chin-Up');
      expect(normalized).toBe('chin_up');
    });

    it('should replace slashes with underscores', () => {
      const normalized = service.getNormalizedName('90/90 Hip Switch');
      expect(normalized).toBe('90_90_hip_switch');
    });

    it('should replace apostrophes with underscores', () => {
      const normalized = service.getNormalizedName("Farmer's Walk");
      expect(normalized).toBe('farmer_s_walk');
    });

    it('should collapse multiple spaces/underscores into single underscore', () => {
      const normalized = service.getNormalizedName('Wide   Grip   Pull Up');
      expect(normalized).toBe('wide_grip_pull_up');
    });

    it('should trim leading and trailing whitespace', () => {
      const normalized = service.getNormalizedName('  Barbell Squat  ');
      expect(normalized).toBe('barbell_squat');
    });

    it('should handle mixed special characters', () => {
      const normalized = service.getNormalizedName("T-Bar Row / Farmer's Walk");
      expect(normalized).toBe('t_bar_row_farmer_s_walk');
    });

    it('should handle empty string', () => {
      const normalized = service.getNormalizedName('');
      expect(normalized).toBe('');
    });
  });

  describe('get', () => {
    it('should return exercise ID from cache when present', async () => {
      const normalizedName = 'barbell_bench_press';
      mockRedisClient.get.mockResolvedValue('1');

      const result = await service.get(normalizedName);

      expect(mockRedisClient.get).toHaveBeenCalledWith('exercise:name:barbell_bench_press');
      expect(result).toBe('1');
    });

    it('should return null when key not found in cache', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.get('barbell_bench_press');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set exercise ID in cache with correct key format', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('barbell_bench_press', '1');

      expect(mockRedisClient.set).toHaveBeenCalledWith('exercise:name:barbell_bench_press', '1');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(service.set('barbell_bench_press', '1')).resolves.toBeUndefined();
    });
  });

  describe('setMany', () => {
    it('should batch set multiple entries using mset', async () => {
      mockRedisClient.mset.mockResolvedValue('OK');

      const entries = new Map([
        ['barbell_bench_press', '1'],
        ['dumbbell_bench_press', '2'],
        ['chin_up', '3'],
      ]);

      await service.setMany(entries);

      expect(mockRedisClient.mset).toHaveBeenCalledWith([
        'exercise:name:barbell_bench_press', '1',
        'exercise:name:dumbbell_bench_press', '2',
        'exercise:name:chin_up', '3',
      ]);
    });

    it('should handle empty map', async () => {
      mockRedisClient.mset.mockResolvedValue('OK');

      const entries = new Map();

      await service.setMany(entries);

      // Should not call mset with empty array
      expect(mockRedisClient.mset).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.mset.mockRejectedValue(new Error('Redis connection failed'));

      const entries = new Map([['barbell_bench_press', '1']]);

      // Should not throw
      await expect(service.setMany(entries)).resolves.toBeUndefined();
    });
  });

  describe('invalidate', () => {
    it('should delete cache entry with correct key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.invalidate('barbell_bench_press');

      expect(mockRedisClient.del).toHaveBeenCalledWith('exercise:name:barbell_bench_press');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(service.invalidate('barbell_bench_press')).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should flush all keys from Redis database', async () => {
      mockRedisClient.flushdb.mockResolvedValue('OK');

      await service.clear();

      expect(mockRedisClient.flushdb).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.flushdb.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(service.clear()).resolves.toBeUndefined();
    });
  });

  describe('warmup', () => {
    it('should populate cache with all exercises from repository', async () => {
      const mockExercises = [
        { id: '1', name: 'Barbell Bench Press', slug: 'barbell-bench-press', tags: [], needsReview: false },
        { id: '2', name: 'Dumbbell Bench Press', slug: 'dumbbell-bench-press', tags: [], needsReview: false },
        { id: '3', name: 'Chin-Up', slug: 'chin-up', tags: [], needsReview: false },
        { id: '4', name: '90/90 Hip Switch', slug: '9090-hip-switch', tags: [], needsReview: false },
      ];

      mockRepository.findAll.mockResolvedValue(mockExercises);
      mockRedisClient.mset.mockResolvedValue('OK');

      await service.warmup();

      expect(mockRepository.findAll).toHaveBeenCalled();

      // Should cache exercise names
      expect(mockRedisClient.mset).toHaveBeenCalledWith([
        'exercise:name:barbell_bench_press', '1',
        'exercise:name:dumbbell_bench_press', '2',
        'exercise:name:chin_up', '3',
        'exercise:name:90_90_hip_switch', '4',
      ]);
    });

    it('should handle empty exercise list', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      mockRedisClient.mset.mockResolvedValue('OK');

      await service.warmup();

      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(mockRedisClient.mset).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.warmup()).resolves.toBeUndefined();
    });

    it('should handle Redis errors gracefully', async () => {
      const mockExercises = [
        { id: '1', name: 'Barbell Bench Press', slug: 'barbell-bench-press', tags: [], needsReview: false },
      ];
      mockRepository.findAll.mockResolvedValue(mockExercises);
      mockRedisClient.mset.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(service.warmup()).resolves.toBeUndefined();
    });
  });

  describe('search result cache', () => {
    const mockSearchResults = [
      {
        exercise: {
          id: '1',
          slug: 'barbell-bench-press',
          name: 'Barbell Bench Press',
          tags: ['chest'],
          needsReview: false,
        },
        similarity: 0.95,
      },
      {
        exercise: {
          id: '2',
          slug: 'dumbbell-bench-press',
          name: 'Dumbbell Bench Press',
          tags: ['chest'],
          needsReview: false,
        },
        similarity: 0.88,
      },
    ];

    it('should get search results from cache', async () => {
      const normalizedQuery = 'bench_press';
      const resultsJson = JSON.stringify(mockSearchResults);

      mockRedisClient.get.mockResolvedValue(resultsJson);

      const result = await service.getSearchResults(normalizedQuery);

      expect(mockRedisClient.get).toHaveBeenCalledWith('search:bench_press');
      expect(result).toEqual(mockSearchResults);
    });

    it('should return null when search results not in cache', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getSearchResults('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');

      const result = await service.getSearchResults('bench_press');

      expect(result).toBeNull();
    });

    it('should set search results in cache', async () => {
      const normalizedQuery = 'bench_press';
      mockRedisClient.set.mockResolvedValue('OK');

      await service.setSearchResults(normalizedQuery, mockSearchResults);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'search:bench_press',
        JSON.stringify(mockSearchResults)
      );
    });

    it('should handle Redis errors gracefully in getSearchResults', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.getSearchResults('bench_press');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully in setSearchResults', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      await expect(service.setSearchResults('bench_press', mockSearchResults)).resolves.toBeUndefined();
    });

    it('should invalidate all search caches', async () => {
      mockRedisClient.keys.mockResolvedValue(['search:bench_press', 'search:squat']);
      mockRedisClient.del.mockResolvedValue(2);

      await service.invalidateSearchCache();

      expect(mockRedisClient.keys).toHaveBeenCalledWith('search:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith('search:bench_press', 'search:squat');
    });

    it('should handle no search caches to invalidate', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await service.invalidateSearchCache();

      expect(mockRedisClient.keys).toHaveBeenCalledWith('search:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully in invalidateSearchCache', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      await expect(service.invalidateSearchCache()).resolves.toBeUndefined();
    });
  });

  describe('graceful degradation', () => {
    it('should handle null Redis client gracefully in get', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);

      const result = await serviceWithoutRedis.get('barbell_bench_press');

      expect(result).toBeNull();
    });

    it('should handle null Redis client gracefully in set', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);

      // Should not throw
      await expect(serviceWithoutRedis.set('barbell_bench_press', '1')).resolves.toBeUndefined();
    });

    it('should handle null Redis client gracefully in setMany', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);
      const entries = new Map([['barbell_bench_press', '1']]);

      // Should not throw
      await expect(serviceWithoutRedis.setMany(entries)).resolves.toBeUndefined();
    });

    it('should handle null Redis client gracefully in invalidate', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);

      // Should not throw
      await expect(serviceWithoutRedis.invalidate('barbell_bench_press')).resolves.toBeUndefined();
    });

    it('should handle null Redis client gracefully in clear', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);

      // Should not throw
      await expect(serviceWithoutRedis.clear()).resolves.toBeUndefined();
    });

    it('should handle null Redis client gracefully in warmup', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);

      // Should not throw
      await expect(serviceWithoutRedis.warmup()).resolves.toBeUndefined();
    });

    it('should handle null Redis client gracefully in getSearchResults', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);

      const result = await serviceWithoutRedis.getSearchResults('bench_press');

      expect(result).toBeNull();
    });

    it('should handle null Redis client gracefully in setSearchResults', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);
      const mockSearchResults = [
        {
          exercise: {
            id: '1',
            slug: 'barbell-bench-press',
            name: 'Barbell Bench Press',
            tags: ['chest'],
            needsReview: false,
          },
          similarity: 0.95,
        },
      ];

      // Should not throw
      await expect(serviceWithoutRedis.setSearchResults('bench_press', mockSearchResults)).resolves.toBeUndefined();
    });

    it('should handle null Redis client gracefully in invalidateSearchCache', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);

      // Should not throw
      await expect(serviceWithoutRedis.invalidateSearchCache()).resolves.toBeUndefined();
    });
  });
});
