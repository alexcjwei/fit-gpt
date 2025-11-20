import { type EmbeddingService } from '../../src/services/embedding.service';
import { type ExerciseCacheService } from '../../src/services/exerciseCache.service';

/**
 * Create a mock embedding service for unit tests
 * Returns a service that generates deterministic zero-filled embeddings
 * to avoid making real API calls during testing
 */
export function createMockEmbeddingService(): jest.Mocked<EmbeddingService> {
  const mockEmbedding = new Array(1536).fill(0);

  return {
    generateEmbedding: jest.fn().mockResolvedValue(mockEmbedding),
    generateEmbeddings: jest.fn().mockResolvedValue([mockEmbedding]),
    cosineSimilarity: jest.fn().mockReturnValue(1.0),
  } as jest.Mocked<EmbeddingService>;
}

/**
 * Create a mock exercise cache service for unit tests
 */
export function createMockExerciseCacheService(): jest.Mocked<ExerciseCacheService> {
  return {
    getNormalizedName: jest.fn((name: string) => name.toLowerCase().replace(/\s+/g, '_')),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    setMany: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    warmup: jest.fn().mockResolvedValue(undefined),
    getSearchResults: jest.fn().mockResolvedValue(null),
    setSearchResults: jest.fn().mockResolvedValue(undefined),
    invalidateSearchCache: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<ExerciseCacheService>;
}

/**
 * Get the string representation of the mock embedding
 * Useful for asserting on database calls
 */
export function getMockEmbeddingString(): string {
  const mockEmbedding = new Array(1536).fill(0);
  return `[${mockEmbedding.join(',')}]`;
}
