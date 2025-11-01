import { Exercise } from '../models/Exercise';
import { connectDatabase } from '../config/database';
import { exercisesData } from '../seed_data/exercises';

/**
 * Seed the database with exercises
 *
 * Usage: npm run seed:exercises
 */

// Map 'id' field to 'slug' field, as MongoDB will generate its own _id
const exercises = exercisesData.map(({ id, ...exercise }) => ({
  ...exercise,
  slug: id,
}));

async function seedExercises() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    console.log('Clearing existing exercises...');
    const deleteResult = await Exercise.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} exercises`);

    console.log('Inserting exercises...');
    const result = await Exercise.insertMany(exercises);
    console.log(`Successfully inserted ${result.length} exercises`);

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding exercises:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedExercises();
}

export { seedExercises };
