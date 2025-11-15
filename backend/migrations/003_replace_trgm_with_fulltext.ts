import { Kysely, sql } from 'kysely';

/**
 * Migration to replace pg_trgm trigram search with PostgreSQL full text search
 *
 * This fixes search bugs where short queries like "chin" were matching unrelated
 * exercises like "Ab Crunch Machine" due to trigram overlap in words like "machine".
 *
 * Full text search uses word-based matching instead of character trigrams, which
 * provides more accurate results for exercise name searches.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Drop the old trigram indexes
  await sql`DROP INDEX IF EXISTS exercises_normalized_name_trgm_idx`.execute(db);
  await sql`DROP INDEX IF EXISTS exercises_name_trgm_idx`.execute(db);

  // Add a generated tsvector column for full text search
  // This column automatically updates when the name changes
  // Normalization: hyphens and slashes become spaces, then convert to lowercase
  await sql`
    ALTER TABLE exercises
    ADD COLUMN name_tsvector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', LOWER(REPLACE(REPLACE(name, '-', ' '), '/', ' ')))
    ) STORED
  `.execute(db);

  // Create GIN index on the tsvector column for efficient full text search
  await sql`
    CREATE INDEX exercises_name_tsvector_idx
    ON exercises
    USING gin (name_tsvector)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the full text search index and column
  await sql`DROP INDEX IF EXISTS exercises_name_tsvector_idx`.execute(db);
  await sql`ALTER TABLE exercises DROP COLUMN IF EXISTS name_tsvector`.execute(db);

  // Restore the old trigram indexes
  await sql`
    CREATE INDEX exercises_name_trgm_idx
    ON exercises
    USING gin (name gin_trgm_ops)
  `.execute(db);

  await sql`
    CREATE INDEX exercises_normalized_name_trgm_idx
    ON exercises
    USING gin (LOWER(REPLACE(REPLACE(name, '-', ' '), '/', ' ')) gin_trgm_ops)
  `.execute(db);
}
