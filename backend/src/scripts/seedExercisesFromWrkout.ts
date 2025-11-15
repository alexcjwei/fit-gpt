import { db } from '../db';
import { connectDatabase } from '../config/database';
import { Exercise as ExerciseType } from '../types';
import { upsertExercises } from './seedExercises';

/**
 * Seed the database with exercises from wrkout/exercises.json GitHub repository
 *
 * This function will:
 * - Fetch all exercises from the wrkout/exercises.json repository
 * - Transform them from wrkout format to our format
 * - Upsert exercises into the database (preserving existing slugs)
 *
 * Usage: npm run seed:exercises:wrkout
 */

// Type definitions for wrkout exercise format
interface WrkoutExercise {
  name: string;
  force: string;
  level: string;
  mechanic: string;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
}

/**
 * Generate a slug from an exercise name
 * Converts to lowercase, replaces special chars with hyphens, removes duplicates
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase() // Convert to lowercase
    .replace(/['"`]/g, '') // Remove quotes and apostrophes
    .replace(/[^a-z0-9\s-]/g, '-') // Replace special chars with hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}

/**
 * Flatten all metadata fields from wrkout exercise into tags array
 * Excludes instructions and name
 */
export function flattenToTags(wrkoutExercise: WrkoutExercise): string[] {
  const tags: string[] = [];

  // Add scalar fields (if they have values)
  if (wrkoutExercise.force) tags.push(wrkoutExercise.force);
  if (wrkoutExercise.level) tags.push(wrkoutExercise.level);
  if (wrkoutExercise.mechanic) tags.push(wrkoutExercise.mechanic);
  if (wrkoutExercise.equipment) tags.push(wrkoutExercise.equipment);
  if (wrkoutExercise.category) tags.push(wrkoutExercise.category);

  // Add primary muscles
  if (wrkoutExercise.primaryMuscles) {
    tags.push(...wrkoutExercise.primaryMuscles.filter((m) => m && m.trim() !== ''));
  }

  // Add secondary muscles
  if (wrkoutExercise.secondaryMuscles) {
    tags.push(...wrkoutExercise.secondaryMuscles.filter((m) => m && m.trim() !== ''));
  }

  // Filter out any null, undefined, or empty strings
  return tags.filter((tag) => tag && tag.trim() !== '');
}

/**
 * Transform a wrkout exercise to our exercise format
 */
export function transformWrkoutExercise(wrkoutExercise: WrkoutExercise): Omit<ExerciseType, 'id'> {
  const slug = generateSlug(wrkoutExercise.name);
  const tags = flattenToTags(wrkoutExercise);

  return {
    slug,
    name: wrkoutExercise.name,
    tags,
    needsReview: false,
  };
}

/**
 * Fetch the list of exercise directory names from GitHub API
 */
export async function fetchExerciseList(): Promise<string[]> {
  const url = 'https://api.github.com/repos/wrkout/exercises.json/git/trees/master?recursive=1';

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'fit-gpt-exercise-importer',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch exercise list: ${response.statusText}`);
  }

  const data = (await response.json()) as { tree: Array<{ path: string; type: string }> };
  const tree = data.tree;

  // Filter for exercise.json files in the exercises directory
  const exerciseFiles = tree.filter(
    (item) => item.type === 'blob' && item.path.match(/^exercises\/[^/]+\/exercise\.json$/)
  );

  // Extract exercise directory names
  const exerciseNames = exerciseFiles.map((item) => {
    const match = item.path.match(/^exercises\/([^/]+)\/exercise\.json$/);
    return match ? match[1] : '';
  }).filter(Boolean);

  return exerciseNames;
}

/**
 * Fetch exercise data from GitHub raw URL
 */
export async function fetchExerciseData(exerciseName: string): Promise<WrkoutExercise> {
  const url = `https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises/${exerciseName}/exercise.json`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'fit-gpt-exercise-importer',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch exercise ${exerciseName}: ${response.statusText}`);
  }

  const data = await response.json();
  return data as WrkoutExercise;
}

/**
 * Main seeding function
 */
async function seedExercisesFromWrkout(): Promise<void> {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    console.log('Fetching exercise list from wrkout/exercises.json...');
    const exerciseNames = await fetchExerciseList();
    console.log(`Found ${exerciseNames.length} exercises`);

    console.log('Fetching and transforming exercises...');
    const exercises: Omit<ExerciseType, 'id'>[] = [];

    for (let i = 0; i < exerciseNames.length; i++) {
      const exerciseName = exerciseNames[i];
      try {
        const wrkoutExercise = await fetchExerciseData(exerciseName);
        const transformed = transformWrkoutExercise(wrkoutExercise);
        exercises.push(transformed);

        if ((i + 1) % 50 === 0) {
          console.log(`Processed ${i + 1}/${exerciseNames.length} exercises...`);
        }
      } catch (error) {
        console.error(`Error fetching exercise ${exerciseName}:`, error);
      }
    }

    console.log(`Successfully transformed ${exercises.length} exercises`);

    // Upsert exercises into database
    await upsertExercises(exercises);

    console.log('Seeding complete!');
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding exercises:', error);
    await db.destroy();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  void seedExercisesFromWrkout();
}

export { seedExercisesFromWrkout };
