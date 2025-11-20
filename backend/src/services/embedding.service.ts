import OpenAI from 'openai';
import { env } from '../config/env';
import type { ExerciseCacheService } from './exerciseCache.service';

/**
 * Embedding Service
 * Generates vector embeddings using OpenAI's text-embedding-3-small model
 * Used for semantic search of exercise names
 * Supports optional Redis caching to reduce API calls
 */
export function createEmbeddingService(cacheService?: ExerciseCacheService) {
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
  const model = 'text-embedding-3-small';
  const dimensions = 1536; // Default dimensions for text-embedding-3-small

  /**
   * Generate embedding for a single text input
   * Checks cache first if available, falls back to API
   * @param text - Text to generate embedding for
   * @returns Vector embedding as array of numbers
   */
  async function generateEmbedding(text: string): Promise<number[]> {
    // Try cache first if available
    if (cacheService) {
      try {
        const normalizedName = cacheService.getNormalizedName(text);
        const cachedEmbedding = await cacheService.getEmbedding(normalizedName);

        if (cachedEmbedding) {
          return cachedEmbedding;
        }
      } catch (error) {
        // Cache error - fall through to API call
        console.error('Cache lookup error, falling back to API:', error);
      }
    }

    // Cache miss or no cache - call API
    const response = await openai.embeddings.create({
      model,
      input: text,
      dimensions,
    });

    const embedding = response.data[0].embedding;

    // Cache the result if cache is available
    if (cacheService) {
      try {
        const normalizedName = cacheService.getNormalizedName(text);
        await cacheService.setEmbedding(normalizedName, embedding);
      } catch (error) {
        // Cache write error - log but don't fail
        console.error('Cache write error:', error);
      }
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts in a single batch request
   * More efficient than individual calls for large batches
   * Checks cache for each text first, only calls API for cache misses
   * @param texts - Array of texts to generate embeddings for
   * @returns Array of vector embeddings
   */
  async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Try to get embeddings from cache first
    const results: (number[] | null)[] = new Array(texts.length).fill(null);
    const textsToFetch: string[] = [];
    const indicesToFetch: number[] = [];

    if (cacheService) {
      // Check cache for each text
      await Promise.all(
        texts.map(async (text, index) => {
          try {
            const normalizedName = cacheService.getNormalizedName(text);
            const cachedEmbedding = await cacheService.getEmbedding(normalizedName);

            if (cachedEmbedding) {
              results[index] = cachedEmbedding;
            } else {
              textsToFetch.push(text);
              indicesToFetch.push(index);
            }
          } catch (error) {
            // Cache error for this text - mark for API fetch
            textsToFetch.push(text);
            indicesToFetch.push(index);
          }
        })
      );
    } else {
      // No cache - fetch all
      textsToFetch.push(...texts);
      indicesToFetch.push(...texts.map((_, i) => i));
    }

    // Fetch missing embeddings from API if any
    if (textsToFetch.length > 0) {
      const response = await openai.embeddings.create({
        model,
        input: textsToFetch,
        dimensions,
      });

      // Sort by index to ensure order matches input
      const fetchedEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);

      // Place fetched embeddings in correct positions
      for (let i = 0; i < fetchedEmbeddings.length; i++) {
        const resultIndex = indicesToFetch[i];
        results[resultIndex] = fetchedEmbeddings[i];
      }

      // Cache newly fetched embeddings
      if (cacheService) {
        try {
          const embeddingsToCache = new Map<string, number[]>();
          for (let i = 0; i < textsToFetch.length; i++) {
            const text = textsToFetch[i];
            const embedding = fetchedEmbeddings[i];
            const normalizedName = cacheService.getNormalizedName(text);
            embeddingsToCache.set(normalizedName, embedding);
          }

          // Batch cache writes
          await cacheService.setManyEmbeddings(embeddingsToCache);
        } catch (error) {
          console.error('Cache write error for batch embeddings:', error);
        }
      }
    }

    // All results should be populated now
    return results as number[][];
  }

  /**
   * Calculate cosine similarity between two embeddings
   * Returns value between -1 and 1, where 1 means identical
   * @param embedding1 - First embedding vector
   * @param embedding2 - Second embedding vector
   * @returns Cosine similarity score
   */
  function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      normA += embedding1[i] * embedding1[i];
      normB += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  return {
    generateEmbedding,
    generateEmbeddings,
    cosineSimilarity,
  };
}

export type EmbeddingService = ReturnType<typeof createEmbeddingService>;
