import { db } from '../db';
import { connectDatabase } from '../config/database';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Exercise as ExerciseType } from '../types';

/**
 * Seed the database with exercises from CSV file using upsert logic
 *
 * This function will:
 * - Update existing exercises if their slug matches
 * - Insert new exercises if no matching slug is found
 * - Delete stale exercises that are in DB but not in CSV
 *
 * Usage: npm run seed:exercises [path/to/exercises.csv]
 * Default path: src/seed_data/exercises.csv
 */

/**
 * Parse a CSV line, handling quoted fields properly
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}

/**
 * Parse CSV content to exercise objects
 */
function parseCsvToExercises(csvContent: string): Omit<ExerciseType, 'id'>[] {
  const lines = csvContent.trim().split('\n');
  const headers = parseCsvLine(lines[0]);
  const exercises: Omit<ExerciseType, 'id'>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const exercise: Partial<Omit<ExerciseType, 'id'>> = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim();

      if (value === undefined || value === '') {
        return; // Skip empty values
      }

      // Handle tags array (semicolon-delimited)
      if (header === 'tags') {
        (exercise as Record<string, unknown>)[header] = value
          .split(';')
          .map((v) => v.trim())
          .filter(Boolean);
      }
      // Handle regular fields (slug, name)
      else {
        (exercise as Record<string, unknown>)[header] = value;
      }
    });

    exercises.push(exercise as Omit<ExerciseType, 'id'>);
  }

  return exercises;
}

/**
 * Load exercises from CSV file
 */
function loadExercisesFromCsv(csvPath: string): Omit<ExerciseType, 'id'>[] {
  console.log(`Loading exercises from CSV: ${csvPath}`);
  const fullPath = csvPath.startsWith('/') ? csvPath : join(process.cwd(), csvPath);
  const csvContent = readFileSync(fullPath, 'utf-8');
  return parseCsvToExercises(csvContent);
}

interface UpsertResult {
  inserted: number;
  updated: number;
  total: number;
}

/**
 * Upsert exercises into the database using Kysely
 * Separated from seedExercises to allow for easier unit testing
 */
async function upsertExercises(exercises: Omit<ExerciseType, 'id'>[]): Promise<UpsertResult> {
  console.log('Upserting exercises...');

  let inserted = 0;
  let updated = 0;

  // Use a transaction to ensure atomicity
  await db.transaction().execute(async (trx) => {
    for (const exercise of exercises) {
      const { tags, ...exerciseWithoutTags } = exercise;

      // Upsert the exercise using ON CONFLICT
      const result = await trx
        .insertInto('exercises')
        .values({
          name: exerciseWithoutTags.name,
          slug: exerciseWithoutTags.slug,
          needs_review: exerciseWithoutTags.needsReview ?? false,
        })
        .onConflict((oc) =>
          oc.column('slug').doUpdateSet({
            name: exerciseWithoutTags.name,
            needs_review: exerciseWithoutTags.needsReview ?? false,
            updated_at: new Date(),
          })
        )
        .returning(['id'])
        .executeTakeFirstOrThrow();

      // Check if this was an insert or update by querying if tags exist
      const existingTags = await trx
        .selectFrom('exercise_tags')
        .where('exercise_id', '=', result.id)
        .select('tag')
        .execute();

      if (existingTags.length === 0) {
        inserted++;
      } else {
        updated++;
      }

      // Delete existing tags for this exercise
      await trx.deleteFrom('exercise_tags').where('exercise_id', '=', result.id).execute();

      // Insert new tags if they exist
      if (tags && tags.length > 0) {
        await trx
          .insertInto('exercise_tags')
          .values(
            tags.map((tag) => ({
              exercise_id: result.id,
              tag,
            }))
          )
          .execute();
      }
    }
  });

  console.log(`Upsert complete:
  - Inserted: ${inserted}
  - Updated: ${updated}
  - Total exercises processed: ${exercises.length}`);

  return { inserted, updated, total: exercises.length };
}

interface DeleteResult {
  deletedCount: number;
}

/**
 * Remove exercises that have slugs but are not in the current CSV
 * Preserves custom exercises (exercises without slugs)
 */
async function removeStaleExercises(currentSlugs: string[]): Promise<DeleteResult> {
  console.log('Removing stale exercises...');

  // Delete exercises that have slugs but are not in the current CSV
  const result = await db
    .deleteFrom('exercises')
    .where('slug', 'is not', null)
    .where('slug', 'not in', currentSlugs)
    .executeTakeFirst();

  const deletedCount = Number(result.numDeletedRows);
  console.log(`Removed ${deletedCount} stale exercise(s)`);

  return { deletedCount };
}

async function seedExercises(csvPath: string, skipConnect = false): Promise<void> {
  try {
    if (!skipConnect) {
      console.log('Connecting to database...');
      await connectDatabase();
    }

    // Load exercises from CSV
    const exercises = loadExercisesFromCsv(csvPath);

    // Upsert exercises into database
    await upsertExercises(exercises);

    // Remove stale exercises (exercises with slugs not in current CSV)
    const currentSlugs = exercises
      .map((ex) => ex.slug)
      .filter((slug): slug is string => Boolean(slug));
    await removeStaleExercises(currentSlugs);

    if (!skipConnect) {
      console.log('Seeding complete!');
      await db.destroy();
      process.exit(0);
    }
  } catch (error) {
    console.error('Error seeding exercises:', error);
    if (!skipConnect) {
      await db.destroy();
      process.exit(1);
    }
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  // Get CSV path from command line args or use default
  const csvPath = process.argv[2] ?? 'src/seed_data/exercises.csv';
  void seedExercises(csvPath);
}

export {
  seedExercises,
  parseCsvLine,
  parseCsvToExercises,
  loadExercisesFromCsv,
  upsertExercises,
  removeStaleExercises,
};
