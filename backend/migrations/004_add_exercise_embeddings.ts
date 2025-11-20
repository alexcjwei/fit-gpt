import { Kysely, sql } from 'kysely';

/**
 * Migration to add pgvector extension and embedding column for semantic search
 * Uses OpenAI text-embedding-3-small (1536 dimensions) for exercise name embeddings
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Enable pgvector extension
  await sql`CREATE EXTENSION IF NOT EXISTS vector`.execute(db);

  // Add name_embedding column to exercises table
  await sql`
    ALTER TABLE exercises
    ADD COLUMN name_embedding vector(1536)
  `.execute(db);

  // Create HNSW index for fast KNN search using cosine distance
  // HNSW (Hierarchical Navigable Small World) is the best index type for vector search
  // m=16 and ef_construction=64 are good defaults balancing speed and accuracy
  await sql`
    CREATE INDEX exercises_name_embedding_hnsw_idx
    ON exercises
    USING hnsw (name_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the index
  await sql`DROP INDEX IF EXISTS exercises_name_embedding_hnsw_idx`.execute(db);

  // Drop the column
  await sql`ALTER TABLE exercises DROP COLUMN IF EXISTS name_embedding`.execute(db);

  // Note: We don't drop the vector extension as other tables might use it
  // If you want to drop it: await sql`DROP EXTENSION IF EXISTS vector`.execute(db);
}
