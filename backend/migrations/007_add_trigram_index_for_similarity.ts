import { Kysely, sql } from 'kysely';

/**
 * Migration to add trigram index for similarity search
 *
 * This supports the new AI fallback implementation that uses trigram similarity
 * search to find exercises before calling the LLM. The GIN index with gin_trgm_ops
 * enables fast similarity queries using the % operator and similarity() function.
 *
 * Note: This complements the existing full text search (name_tsvector) which is
 * still used by the exercise search service. Both indexes serve different purposes:
 * - Full text search: Word-based matching for direct user searches
 * - Trigram similarity: Character-based fuzzy matching for AI fallback
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Create GIN index on exercise name for trigram similarity search
  // This enables fast queries using the % operator (similarity threshold)
  await sql`
    CREATE INDEX exercises_name_trgm_similarity_idx
    ON exercises
    USING gin (name gin_trgm_ops)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the trigram similarity index
  await sql`DROP INDEX IF EXISTS exercises_name_trgm_similarity_idx`.execute(db);
}
