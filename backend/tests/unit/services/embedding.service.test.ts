import { createEmbeddingService } from '../../../src/services/embedding.service';
import { type ExerciseCacheService } from '../../../src/services/exerciseCache.service';

/**
 * Unit tests for EmbeddingService
 * Pure unit tests that mock external dependencies
 * Integration tests that hit the OpenAI API are in tests/integration/services/embedding.service.test.ts
 */
describe('EmbeddingService Unit Tests', () => {
  describe('with Redis cache', () => {
    let mockCacheService: jest.Mocked<ExerciseCacheService>;

    beforeEach(() => {
      jest.clearAllMocks();

      // Create mock cache service
      mockCacheService = {
        getNormalizedName: jest.fn((name: string) => name.toLowerCase().replace(/\s+/g, '_')),
        getEmbedding: jest.fn(),
        setEmbedding: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        setMany: jest.fn(),
        invalidate: jest.fn(),
        clear: jest.fn(),
        warmup: jest.fn(),
        setManyEmbeddings: jest.fn(),
      } as any;
    });

    it('should return cached embedding if available', async () => {
      const text = 'Bench Press';
      const cachedEmbedding = new Array(1536).fill(0.5);

      mockCacheService.getEmbedding.mockResolvedValue(cachedEmbedding);

      const serviceWithCache = createEmbeddingService(mockCacheService);
      const result = await serviceWithCache.generateEmbedding(text);

      expect(mockCacheService.getNormalizedName).toHaveBeenCalledWith(text);
      expect(mockCacheService.getEmbedding).toHaveBeenCalledWith('bench_press');
      expect(result).toEqual(cachedEmbedding);
    });

  });
});
