/**
 * Script to generate embeddings for all exercises in the database
 * Run with: npm run generate:embeddings
 */

import { db } from '../src/db';
import { createExerciseRepository } from '../src/repositories/ExerciseRepository';
import { createEmbeddingService } from '../src/services/embedding.service';
import { sql } from 'kysely';

const BATCH_SIZE = 100; // Process exercises in batches to avoid overwhelming OpenAI API

async function generateEmbeddingsForAllExercises() {
  console.log('='.repeat(80));
  console.log('GENERATE EMBEDDINGS FOR ALL EXERCISES');
  console.log('='.repeat(80));
  console.log();

  const embeddingService = createEmbeddingService();
  const exerciseRepository = createExerciseRepository(db);

  try {
    // Fetch all exercises
    console.log('Fetching all exercises from database...');
    const allExercises = await exerciseRepository.findAll();
    console.log(`Found ${allExercises.length} exercises`);
    console.log();

    // Filter to only exercises without embeddings using raw SQL
    const exercisesWithoutEmbeddingsResult = await sql<{ id: bigint }>`
      SELECT id FROM exercises WHERE name_embedding IS NULL
    `.execute(db);

    const exerciseIdsWithoutEmbeddings = new Set(
      exercisesWithoutEmbeddingsResult.rows.map(row => row.id)
    );

    const exercisesNeedingEmbeddings = allExercises.filter(ex =>
      exerciseIdsWithoutEmbeddings.has(BigInt(ex.id))
    );

    console.log(`Exercises already with embeddings: ${allExercises.length - exercisesNeedingEmbeddings.length}`);
    console.log(`Exercises needing embeddings: ${exercisesNeedingEmbeddings.length}`);
    console.log();

    if (exercisesNeedingEmbeddings.length === 0) {
      console.log('All exercises already have embeddings!');
      return;
    }

    // Process in batches
    const batches = [];
    for (let i = 0; i < exercisesNeedingEmbeddings.length; i += BATCH_SIZE) {
      batches.push(exercisesNeedingEmbeddings.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${batches.length} batch(es) of ${BATCH_SIZE} exercises each...`);
    console.log();

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      console.log(`Batch ${batchIndex + 1}/${batches.length}: Processing ${batch.length} exercises...`);

      try {
        // Generate embeddings for the batch
        const exerciseNames = batch.map(ex => ex.name);
        const embeddings = await embeddingService.generateEmbeddings(exerciseNames);

        // Update each exercise with its embedding
        for (let i = 0; i < batch.length; i++) {
          const exercise = batch[i];
          const embedding = embeddings[i];

          try {
            const embeddingStr = `[${embedding.join(',')}]`;

            await exerciseRepository.update(exercise.id, {
              name_embedding: embeddingStr,
            });

            successCount++;
          } catch (error) {
            console.error(`  ✗ Failed to update "${exercise.name}":`, error);
            errorCount++;
          }
        }

        processedCount += batch.length;
        console.log(`  ✓ Batch complete: ${successCount}/${processedCount} successful`);
        console.log();

        // Add a small delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      } catch (error) {
        console.error(`  ✗ Batch ${batchIndex + 1} failed:`, error);
        errorCount += batch.length;
        console.log();
      }
    }

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total exercises: ${exercisesNeedingEmbeddings.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log();

    if (successCount === exercisesNeedingEmbeddings.length) {
      console.log('✓ All exercises now have embeddings!');
    } else {
      console.log('⚠ Some exercises failed to update. Check the errors above.');
    }
  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  } finally {
    // Close database connection
    await db.destroy();
  }
}

// Run the script
generateEmbeddingsForAllExercises()
  .then(() => {
    console.log();
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error();
    console.error('Script failed:', error);
    process.exit(1);
  });
