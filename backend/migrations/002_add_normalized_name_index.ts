import { Kysely, sql } from 'kysely';

/**
 * Migration to add a functional GIN index on normalized exercise names
 * This improves search performance for queries with hyphens/slashes replaced by spaces
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Create GIN index on normalized exercise name for efficient search
  // This normalizes hyphens and slashes to spaces, and converts to lowercase
  // Example: "Chin-up" -> "chin up", "90/90 Hip Switch" -> "90 90 hip switch"
  await sql`
    CREATE INDEX exercises_normalized_name_trgm_idx
    ON exercises
    USING gin (LOWER(REPLACE(REPLACE(name, '-', ' '), '/', ' ')) gin_trgm_ops)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the functional index
  await sql`DROP INDEX IF EXISTS exercises_normalized_name_trgm_idx`.execute(db);
}
