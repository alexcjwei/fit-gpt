/**
 * Centralized string normalization utilities
 * Provides consistent normalization for cache keys and database slugs
 */

/**
 * Normalize a string for use as a Redis cache key
 * Used for consistent cache key generation across exercise names and search queries
 *
 * Normalization rules:
 * - Trim whitespace
 * - Convert to lowercase
 * - Replace special chars (hyphens, slashes, apostrophes, spaces) with underscores
 * - Collapse multiple underscores into single underscore
 *
 * Examples:
 * - "Barbell Bench Press" → "barbell_bench_press"
 * - "Chin-Up" → "chin_up"
 * - "90/90 Hip Switch" → "90_90_hip_switch"
 * - "Farmer's Walk" → "farmer_s_walk"
 *
 * @param text - Text to normalize
 * @returns Normalized string suitable for cache keys
 */
export function normalizeForCache(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[-\/'\s]+/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Normalize a string for use as a database slug
 * Used for creating URL-friendly slugs from exercise names
 *
 * Normalization rules:
 * - Convert to lowercase
 * - Replace whitespace with hyphens
 * - Remove all non-alphanumeric characters except hyphens
 *
 * Examples:
 * - "Barbell Bench Press" → "barbell-bench-press"
 * - "Chin-Up" → "chin-up"
 * - "T-Bar Row" → "t-bar-row"
 *
 * @param text - Text to normalize
 * @returns Normalized string suitable for database slugs
 */
export function normalizeForSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
