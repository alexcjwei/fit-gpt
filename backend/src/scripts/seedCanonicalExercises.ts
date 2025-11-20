import { db } from '../db';
import { connectDatabase } from '../config/database';
import { Exercise as ExerciseType } from '../types';
import { upsertExercises, generateSlug } from './seedExercisesFromWrkout';

/**
 * Seed the database with canonical exercises (without variants)
 *
 * This script seeds fundamental exercises like "Bench Press", "Deadlift", "Pull-ups"
 * to avoid ambiguity between variants. It runs after the wrkout seeding script.
 *
 * These exercises represent the most common, unambiguous exercise names that users
 * are likely to reference in their workouts.
 *
 * Usage: npm run seed:exercises:canonical
 */

// Define canonical exercises with their metadata
const CANONICAL_EXERCISES: Array<Omit<ExerciseType, 'id' | 'slug'>> = [
  // ============================================
  // PUSH MOVEMENTS - CHEST
  // ============================================
  {
    name: 'Bench Press',
    tags: ['chest', 'push', 'barbell', 'compound', 'horizontal-push'],
    needsReview: false,
  },
  {
    name: 'Barbell Bench Press',
    tags: ['chest', 'push', 'barbell', 'compound', 'horizontal-push'],
    needsReview: false,
  },
  {
    name: 'Incline Bench Press',
    tags: ['chest', 'push', 'barbell', 'compound', 'incline-push'],
    needsReview: false,
  },
  {
    name: 'Decline Bench Press',
    tags: ['chest', 'push', 'barbell', 'compound', 'decline-push'],
    needsReview: false,
  },
  {
    name: 'Dumbbell Bench Press',
    tags: ['chest', 'push', 'dumbbell', 'compound', 'horizontal-push'],
    needsReview: false,
  },
  {
    name: 'Push-ups',
    tags: ['chest', 'push', 'bodyweight', 'compound', 'horizontal-push'],
    needsReview: false,
  },
  {
    name: 'Dips',
    tags: ['chest', 'triceps', 'push', 'bodyweight', 'compound', 'vertical-push'],
    needsReview: false,
  },

  // ============================================
  // PUSH MOVEMENTS - SHOULDERS
  // ============================================
  {
    name: 'Overhead Press',
    tags: ['shoulders', 'push', 'barbell', 'compound', 'vertical-push'],
    needsReview: false,
  },
  {
    name: 'Dumbbell Shoulder Press',
    tags: ['shoulders', 'push', 'dumbbell', 'compound', 'vertical-push'],
    needsReview: false,
  },
  {
    name: 'Lateral Raise',
    tags: ['shoulders', 'dumbbell', 'isolation', 'side-delts'],
    needsReview: false,
  },
  {
    name: 'Front Raise',
    tags: ['shoulders', 'dumbbell', 'isolation', 'front-delts'],
    needsReview: false,
  },
  {
    name: 'Face Pulls',
    tags: ['shoulders', 'rear-delts', 'cable', 'isolation'],
    needsReview: false,
  },

  // ============================================
  // PUSH MOVEMENTS - TRICEPS
  // ============================================
  {
    name: 'Tricep Extension',
    tags: ['triceps', 'push', 'dumbbell', 'isolation'],
    needsReview: false,
  },
  {
    name: 'Tricep Pushdown',
    tags: ['triceps', 'push', 'cable', 'isolation'],
    needsReview: false,
  },

  // ============================================
  // PULL MOVEMENTS - BACK
  // ============================================
  {
    name: 'Deadlift',
    tags: ['back', 'hamstrings', 'glutes', 'pull', 'barbell', 'compound', 'hinge'],
    needsReview: false,
  },
  {
    name: 'Romanian Deadlift',
    tags: ['back', 'hamstrings', 'glutes', 'pull', 'barbell', 'compound', 'hinge'],
    needsReview: false,
  },
  {
    name: 'Pull-ups',
    tags: ['back', 'lats', 'pull', 'bodyweight', 'compound', 'vertical-pull'],
    needsReview: false,
  },
  {
    name: 'Chin-ups',
    tags: ['back', 'lats', 'biceps', 'pull', 'bodyweight', 'compound', 'vertical-pull'],
    needsReview: false,
  },
  {
    name: 'Barbell Row',
    tags: ['back', 'lats', 'pull', 'barbell', 'compound', 'horizontal-pull'],
    needsReview: false,
  },
  {
    name: 'Dumbbell Row',
    tags: ['back', 'lats', 'pull', 'dumbbell', 'compound', 'horizontal-pull'],
    needsReview: false,
  },
  {
    name: 'Lat Pulldown',
    tags: ['back', 'lats', 'pull', 'cable', 'compound', 'vertical-pull'],
    needsReview: false,
  },
  {
    name: 'Seated Cable Row',
    tags: ['back', 'lats', 'pull', 'cable', 'compound', 'horizontal-pull'],
    needsReview: false,
  },

  // ============================================
  // PULL MOVEMENTS - BICEPS
  // ============================================
  {
    name: 'Bicep Curl',
    tags: ['biceps', 'pull', 'dumbbell', 'isolation'],
    needsReview: false,
  },
  {
    name: 'Barbell Curl',
    tags: ['biceps', 'pull', 'barbell', 'isolation'],
    needsReview: false,
  },
  {
    name: 'Hammer Curl',
    tags: ['biceps', 'forearms', 'pull', 'dumbbell', 'isolation'],
    needsReview: false,
  },

  // ============================================
  // SQUAT MOVEMENTS - QUADS
  // ============================================
  {
    name: 'Squat',
    tags: ['quads', 'glutes', 'legs', 'barbell', 'compound', 'squat'],
    needsReview: false,
  },
  {
    name: 'Barbell Back Squat',
    tags: ['quads', 'glutes', 'legs', 'barbell', 'compound', 'squat'],
    needsReview: false,
  },
  {
    name: 'Barbell Front Squat',
    tags: ['quads', 'glutes', 'legs', 'barbell', 'compound', 'squat'],
    needsReview: false,
  },
  {
    name: 'Front Squat',
    tags: ['quads', 'glutes', 'legs', 'barbell', 'compound', 'squat'],
    needsReview: false,
  },
  {
    name: 'Goblet Squat',
    tags: ['quads', 'glutes', 'legs', 'dumbbell', 'compound', 'squat'],
    needsReview: false,
  },
  {
    name: 'Bulgarian Split Squat',
    tags: ['quads', 'glutes', 'legs', 'dumbbell', 'compound', 'unilateral'],
    needsReview: false,
  },
  {
    name: 'Leg Press',
    tags: ['quads', 'glutes', 'legs', 'machine', 'compound'],
    needsReview: false,
  },
  {
    name: 'Leg Extension',
    tags: ['quads', 'legs', 'machine', 'isolation'],
    needsReview: false,
  },
  {
    name: 'Lunge',
    tags: ['quads', 'glutes', 'legs', 'bodyweight', 'dumbbell', 'compound', 'unilateral'],
    needsReview: false,
  },

  // ============================================
  // HAMSTRINGS & GLUTES
  // ============================================
  {
    name: 'Leg Curl',
    tags: ['hamstrings', 'legs', 'machine', 'isolation'],
    needsReview: false,
  },
  {
    name: 'Nordic Curl',
    tags: ['hamstrings', 'legs', 'bodyweight', 'compound'],
    needsReview: false,
  },
  {
    name: 'Hip Thrust',
    tags: ['glutes', 'hamstrings', 'legs', 'barbell', 'compound'],
    needsReview: false,
  },
  {
    name: 'Glute Bridge',
    tags: ['glutes', 'hamstrings', 'legs', 'bodyweight', 'compound'],
    needsReview: false,
  },

  // ============================================
  // CALVES
  // ============================================
  {
    name: 'Calf Raise',
    tags: ['calves', 'legs', 'bodyweight', 'machine', 'isolation'],
    needsReview: false,
  },

  // ============================================
  // OLYMPIC LIFTS
  // ============================================
  {
    name: 'Clean',
    tags: ['full-body', 'olympic', 'barbell', 'compound', 'power'],
    needsReview: false,
  },
  {
    name: 'Snatch',
    tags: ['full-body', 'olympic', 'barbell', 'compound', 'power'],
    needsReview: false,
  },
  {
    name: 'Clean and Jerk',
    tags: ['full-body', 'olympic', 'barbell', 'compound', 'power'],
    needsReview: false,
  },
  {
    name: 'Power Clean',
    tags: ['full-body', 'olympic', 'barbell', 'compound', 'power'],
    needsReview: false,
  },

  // ============================================
  // CORE
  // ============================================
  {
    name: 'Plank',
    tags: ['core', 'abs', 'bodyweight', 'isometric'],
    needsReview: false,
  },
  {
    name: 'Sit-ups',
    tags: ['core', 'abs', 'bodyweight', 'isolation'],
    needsReview: false,
  },
  {
    name: 'Crunches',
    tags: ['core', 'abs', 'bodyweight', 'isolation'],
    needsReview: false,
  },
  {
    name: 'Russian Twist',
    tags: ['core', 'abs', 'obliques', 'bodyweight', 'isolation'],
    needsReview: false,
  },
  {
    name: 'Leg Raises',
    tags: ['core', 'abs', 'bodyweight', 'isolation'],
    needsReview: false,
  },
  {
    name: 'Hanging Leg Raises',
    tags: ['core', 'abs', 'bodyweight', 'compound'],
    needsReview: false,
  },

  // ============================================
  // CARDIO
  // ============================================
  {
    name: 'Run',
    tags: ['cardio', 'running', 'conditioning', 'endurance'],
    needsReview: false,
  },
  {
    name: 'Jog',
    tags: ['cardio', 'running', 'conditioning', 'endurance'],
    needsReview: false,
  },
  {
    name: 'Sprint',
    tags: ['cardio', 'running', 'conditioning', 'power', 'speed'],
    needsReview: false,
  },
  {
    name: 'Bike',
    tags: ['cardio', 'cycling', 'conditioning', 'endurance'],
    needsReview: false,
  },
  {
    name: 'Stationary Bike',
    tags: ['cardio', 'cycling', 'conditioning', 'endurance', 'machine'],
    needsReview: false,
  },
  {
    name: 'Swim',
    tags: ['cardio', 'swimming', 'conditioning', 'endurance', 'full-body'],
    needsReview: false,
  },
  {
    name: 'Rowing',
    tags: ['cardio', 'rowing', 'conditioning', 'endurance', 'full-body', 'pull'],
    needsReview: false,
  },
  {
    name: 'Elliptical',
    tags: ['cardio', 'conditioning', 'endurance', 'machine'],
    needsReview: false,
  },
  {
    name: 'Jump Rope',
    tags: ['cardio', 'conditioning', 'endurance', 'power', 'bodyweight'],
    needsReview: false,
  },
  {
    name: 'Burpees',
    tags: ['cardio', 'conditioning', 'full-body', 'bodyweight', 'compound'],
    needsReview: false,
  },
  {
    name: 'Box Jumps',
    tags: ['cardio', 'plyometric', 'legs', 'power', 'bodyweight'],
    needsReview: false,
  },
];

/**
 * Main seeding function
 */
async function seedCanonicalExercises(): Promise<void> {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    console.log(`Preparing ${CANONICAL_EXERCISES.length} canonical exercises...`);

    // Generate slugs for all exercises
    const exercisesWithSlugs: Omit<ExerciseType, 'id'>[] = CANONICAL_EXERCISES.map(
      (exercise) => ({
        ...exercise,
        slug: generateSlug(exercise.name),
      })
    );

    console.log('Sample exercises:');
    exercisesWithSlugs.slice(0, 5).forEach((ex) => {
      console.log(`  - ${ex.name} (${ex.slug})`);
    });

    // Upsert exercises into database
    await upsertExercises(exercisesWithSlugs);

    console.log('Canonical exercise seeding complete!');
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding canonical exercises:', error);
    await db.destroy();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  void seedCanonicalExercises();
}

export { seedCanonicalExercises, CANONICAL_EXERCISES };
