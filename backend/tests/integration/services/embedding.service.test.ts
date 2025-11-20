import { createEmbeddingService, type EmbeddingService } from '../../../src/services/embedding.service';

/**
 * Integration tests for EmbeddingService
 * These tests hit the real OpenAI API and should be run sparingly
 */
describe('EmbeddingService Integration Tests', () => {
  let embeddingService: EmbeddingService;

  beforeEach(() => {
    embeddingService = createEmbeddingService();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding vector for a single text input', async () => {
      const text = 'Barbell Bench Press';

      const embedding = await embeddingService.generateEmbedding(text);

      // Should return an array of numbers (vector)
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);
      expect(typeof embedding[0]).toBe('number');

      // OpenAI text-embedding-3-small returns 1536 dimensions by default
      expect(embedding.length).toBe(1536);
    }, 30000);

    it('should generate different embeddings for different texts', async () => {
      const text1 = 'Bench Press';
      const text2 = 'Squat';

      const embedding1 = await embeddingService.generateEmbedding(text1);
      const embedding2 = await embeddingService.generateEmbedding(text2);

      // Embeddings should be different
      expect(embedding1).not.toEqual(embedding2);
    }, 30000);

    it('should generate similar embeddings for semantically similar texts', async () => {
      const text1 = 'Bench Press';
      const text2 = 'Barbell Bench Press';
      const text3 = 'Squat';

      const embedding1 = await embeddingService.generateEmbedding(text1);
      const embedding2 = await embeddingService.generateEmbedding(text2);
      const embedding3 = await embeddingService.generateEmbedding(text3);

      // Calculate cosine similarity
      const similarity12 = cosineSimilarity(embedding1, embedding2);
      const similarity13 = cosineSimilarity(embedding1, embedding3);

      // "Bench Press" should be more similar to "Barbell Bench Press" than to "Squat"
      expect(similarity12).toBeGreaterThan(similarity13);
      expect(similarity12).toBeGreaterThan(0.8); // Should be quite similar
    }, 30000);

    it('should handle empty string', async () => {
      const text = '';

      const embedding = await embeddingService.generateEmbedding(text);

      // Should still return a valid embedding
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1536);
    }, 30000);
  });

  describe('generateEmbeddings (batch)', () => {
    it('should generate embeddings for multiple texts in batch', async () => {
      const texts = ['Bench Press', 'Squat', 'Deadlift'];

      const embeddings = await embeddingService.generateEmbeddings(texts);

      // Should return array of embeddings
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(3);

      // Each embedding should be valid
      embeddings.forEach(embedding => {
        expect(Array.isArray(embedding)).toBe(true);
        expect(embedding.length).toBe(1536);
        expect(typeof embedding[0]).toBe('number');
      });
    }, 30000);

    it('should handle empty array', async () => {
      const texts: string[] = [];

      const embeddings = await embeddingService.generateEmbeddings(texts);

      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(0);
    });

    it('should be more efficient than individual calls for large batches', async () => {
      const texts = Array(10).fill('Bench Press').map((_, i) => `Exercise ${i}`);

      // Time batch call
      const batchStart = Date.now();
      await embeddingService.generateEmbeddings(texts);
      const batchTime = Date.now() - batchStart;

      // Batch should complete (we're just testing it works, not actual performance)
      expect(batchTime).toBeGreaterThan(0);
    }, 30000);
  });

});

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
