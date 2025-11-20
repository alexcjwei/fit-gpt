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
    it('should populate cache with all exercises and embeddings from repository', async () => {
      const mockEmbedding1 = new Array(1536).fill(0.1);
      const mockEmbedding2 = new Array(1536).fill(0.2);

      const mockExercisesWithEmbeddings = [
        { id: '1', name: 'Barbell Bench Press', name_embedding: mockEmbedding1 },
        { id: '2', name: 'Dumbbell Bench Press', name_embedding: mockEmbedding2 },
        { id: '3', name: 'Chin-Up', name_embedding: null },
        { id: '4', name: '90/90 Hip Switch', name_embedding: null },
      ];

      mockRepository.findAllWithEmbeddings.mockResolvedValue(mockExercisesWithEmbeddings);
      mockRedisClient.mset.mockResolvedValue('OK');

      await service.warmup();

      expect(mockRepository.findAllWithEmbeddings).toHaveBeenCalled();

      // Should cache exercise names
      expect(mockRedisClient.mset).toHaveBeenCalledWith([
        'exercise:name:barbell_bench_press', '1',
        'exercise:name:dumbbell_bench_press', '2',
        'exercise:name:chin_up', '3',
        'exercise:name:90_90_hip_switch', '4',
      ]);

      // Should cache embeddings (only for exercises that have them)
      expect(mockRedisClient.mset).toHaveBeenCalledWith([
        'embedding:barbell_bench_press', JSON.stringify(mockEmbedding1),
        'embedding:dumbbell_bench_press', JSON.stringify(mockEmbedding2),
      ]);
    });

    it('should handle empty exercise list', async () => {
      mockRepository.findAllWithEmbeddings.mockResolvedValue([]);
      mockRedisClient.mset.mockResolvedValue('OK');

      await service.warmup();

      expect(mockRepository.findAllWithEmbeddings).toHaveBeenCalled();
      expect(mockRedisClient.mset).not.toHaveBeenCalled();
    });

    it('should handle exercises with no embeddings', async () => {
      const mockExercisesNoEmbeddings = [
        { id: '1', name: 'Barbell Bench Press', name_embedding: null },
        { id: '2', name: 'Squat', name_embedding: null },
      ];

      mockRepository.findAllWithEmbeddings.mockResolvedValue(mockExercisesNoEmbeddings);
      mockRedisClient.mset.mockResolvedValue('OK');

      await service.warmup();

      // Should cache exercise names
      expect(mockRedisClient.mset).toHaveBeenCalledWith([
        'exercise:name:barbell_bench_press', '1',
        'exercise:name:squat', '2',
      ]);

      // Should be called twice: once for names, but NOT for embeddings (since there are none)
      expect(mockRedisClient.mset).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors gracefully', async () => {
      mockRepository.findAllWithEmbeddings.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.warmup()).resolves.toBeUndefined();
    });

    it('should handle Redis errors gracefully', async () => {
      const mockExercisesWithEmbeddings = [
        { id: '1', name: 'Barbell Bench Press', name_embedding: new Array(1536).fill(0.1) },
      ];
      mockRepository.findAllWithEmbeddings.mockResolvedValue(mockExercisesWithEmbeddings);
      mockRedisClient.mset.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(service.warmup()).resolves.toBeUndefined();
    });
  });

  describe('embedding cache', () => {
    it('should get embedding from cache', async () => {
      const normalizedName = 'bench_press';
      const mockEmbedding = new Array(1536).fill(0.5);
      const embeddingJson = JSON.stringify(mockEmbedding);

      mockRedisClient.get.mockResolvedValue(embeddingJson);

      const result = await service.getEmbedding(normalizedName);

      expect(mockRedisClient.get).toHaveBeenCalledWith('embedding:bench_press');
      expect(result).toEqual(mockEmbedding);
    });

    it('should return null when embedding not in cache', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getEmbedding('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');

      const result = await service.getEmbedding('bench_press');

      expect(result).toBeNull();
    });

    it('should set embedding in cache', async () => {
      const normalizedName = 'bench_press';
      const mockEmbedding = new Array(1536).fill(0.5);
      mockRedisClient.set.mockResolvedValue('OK');

      await service.setEmbedding(normalizedName, mockEmbedding);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'embedding:bench_press',
        JSON.stringify(mockEmbedding)
      );
    });

    it('should batch set multiple embeddings using mset', async () => {
      mockRedisClient.mset.mockResolvedValue('OK');

      const entries = new Map<string, number[]>([
        ['bench_press', new Array(1536).fill(0.5)],
        ['squat', new Array(1536).fill(0.6)],
        ['deadlift', new Array(1536).fill(0.7)],
      ]);

      await service.setManyEmbeddings(entries);

      const expectedArgs = [
        'embedding:bench_press', JSON.stringify(new Array(1536).fill(0.5)),
        'embedding:squat', JSON.stringify(new Array(1536).fill(0.6)),
        'embedding:deadlift', JSON.stringify(new Array(1536).fill(0.7)),
      ];

      expect(mockRedisClient.mset).toHaveBeenCalledWith(expectedArgs);
    });

    it('should handle empty map in setManyEmbeddings', async () => {
      const entries = new Map<string, number[]>();

      await service.setManyEmbeddings(entries);

      expect(mockRedisClient.mset).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully in getEmbedding', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.getEmbedding('bench_press');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully in setEmbedding', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));
      const mockEmbedding = new Array(1536).fill(0.5);

      await expect(service.setEmbedding('bench_press', mockEmbedding)).resolves.toBeUndefined();
    });

    it('should handle Redis errors gracefully in setManyEmbeddings', async () => {
      mockRedisClient.mset.mockRejectedValue(new Error('Redis error'));
      const entries = new Map<string, number[]>([
        ['bench_press', new Array(1536).fill(0.5)],
      ]);

      await expect(service.setManyEmbeddings(entries)).resolves.toBeUndefined();
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

    it('should handle null Redis client gracefully in getEmbedding', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);

      const result = await serviceWithoutRedis.getEmbedding('bench_press');

      expect(result).toBeNull();
    });

    it('should handle null Redis client gracefully in setEmbedding', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);
      const mockEmbedding = new Array(1536).fill(0.5);

      // Should not throw
      await expect(serviceWithoutRedis.setEmbedding('bench_press', mockEmbedding)).resolves.toBeUndefined();
    });

    it('should handle null Redis client gracefully in setManyEmbeddings', async () => {
      const serviceWithoutRedis = createExerciseCacheService(null, mockRepository);
      const entries = new Map<string, number[]>([
        ['bench_press', new Array(1536).fill(0.5)],
      ]);

      // Should not throw
      await expect(serviceWithoutRedis.setManyEmbeddings(entries)).resolves.toBeUndefined();
    });
  });
});
