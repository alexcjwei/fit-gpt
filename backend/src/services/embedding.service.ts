import OpenAI from 'openai';
import { env } from '../config/env';

/**
 * Embedding Service
 * Generates vector embeddings using OpenAI's text-embedding-3-small model
 * Used for semantic search of exercise names
 */
export function createEmbeddingService() {
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
  const model = 'text-embedding-3-small';
  const dimensions = 1536; // Default dimensions for text-embedding-3-small

  /**
   * Generate embedding for a single text input
   * @param text - Text to generate embedding for
   * @returns Vector embedding as array of numbers
   */
  async function generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model,
      input: text,
      dimensions,
    });

    return response.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts in a single batch request
   * More efficient than individual calls for large batches
   * @param texts - Array of texts to generate embeddings for
   * @returns Array of vector embeddings
   */
  async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const response = await openai.embeddings.create({
      model,
      input: texts,
      dimensions,
    });

    // Sort by index to ensure order matches input
    return response.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);
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
