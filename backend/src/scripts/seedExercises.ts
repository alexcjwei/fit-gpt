import { Exercise } from '../models/Exercise';
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
 * - Preserve exercises that are not in the seed data
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
    const exercise: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim();

      if (!value) {
        return; // Skip empty values
      }

      // Handle tags array (semicolon-delimited)
      if (header === 'tags') {
        exercise[header] = value.split(';').map((v) => v.trim()).filter(Boolean);
      }
      // Handle regular fields (slug, name)
      else {
        exercise[header] = value;
      }
    });

    exercises.push(exercise);
  }

  return exercises;
}

/**
 * Load exercises from CSV file
 */
function loadExercisesFromCsv(csvPath: string): any[] {
  console.log(`Loading exercises from CSV: ${csvPath}`);
  const fullPath = csvPath.startsWith('/') ? csvPath : join(process.cwd(), csvPath);
  const csvContent = readFileSync(fullPath, 'utf-8');
  return parseCsvToExercises(csvContent);
}

/**
 * Upsert exercises into the database
 * Separated from seedExercises to allow for easier unit testing
 */
async function upsertExercises(exercises: any[]) {
  console.log('Upserting exercises...');

  // Use bulkWrite to perform upsert operations
  const bulkOps = exercises.map((exercise) => ({
    updateOne: {
      filter: { slug: exercise.slug },
      update: { $set: exercise },
      upsert: true,
    },
  }));

  const result = await Exercise.bulkWrite(bulkOps);

  console.log(`Upsert complete:
  - Matched: ${result.matchedCount}
  - Modified: ${result.modifiedCount}
  - Upserted: ${result.upsertedCount}
  - Total exercises processed: ${exercises.length}`);

  return result;
}

/**
 * Remove exercises that have slugs but are not in the current CSV
 * Preserves custom exercises (exercises without slugs)
 */
async function removeStaleExercises(currentSlugs: string[]) {
  console.log('Removing stale exercises...');

  // Delete exercises that:
  // 1. Have a slug field (exists and is not null)
  // 2. Their slug is not in the current CSV slugs
  const result = await Exercise.deleteMany({
    slug: { $exists: true, $ne: null, $nin: currentSlugs },
  });

  console.log(`Removed ${result.deletedCount} stale exercise(s)`);

  return result;
}

async function seedExercises(csvPath: string, skipConnect = false) {
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
    const currentSlugs = exercises.map((ex) => ex.slug).filter(Boolean);
    await removeStaleExercises(currentSlugs);

    if (!skipConnect) {
      console.log('Seeding complete!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error seeding exercises:', error);
    if (!skipConnect) {
      process.exit(1);
    }
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  // Get CSV path from command line args or use default
  const csvPath = process.argv[2] || 'src/seed_data/exercises.csv';
  seedExercises(csvPath);
}

export { seedExercises, parseCsvLine, parseCsvToExercises, loadExercisesFromCsv, upsertExercises, removeStaleExercises };
