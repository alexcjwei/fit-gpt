import { type EmbeddingService } from '../../src/services/embedding.service';

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
 * Get the string representation of the mock embedding
 * Useful for asserting on database calls
 */
export function getMockEmbeddingString(): string {
  const mockEmbedding = new Array(1536).fill(0);
  return `[${mockEmbedding.join(',')}]`;
}
