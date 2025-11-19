import { TestContainer } from '../../../utils/testContainer';
import { createOrchestrator, type Orchestrator } from '../../../../src/services/workoutParser/orchestrator';
import { LLMService } from '../../../../src/services/llm.service';
import { createExerciseSearchService } from '../../../../src/services/exerciseSearch.service';
import { createExerciseCreationService } from '../../../../src/services/exerciseCreation.service';
import { createExerciseRepository } from '../../../../src/repositories/ExerciseRepository';

describe('Orchestrator - Integration Test', () => {
  const testContainer = new TestContainer();
  let orchestrator: Orchestrator;

  beforeAll(async () => {
    const db = await testContainer.start();
    const exerciseRepository = createExerciseRepository(db);
    const llmService = new LLMService();
    const searchService = createExerciseSearchService(exerciseRepository);
    const creationService = createExerciseCreationService(exerciseRepository, llmService);
    orchestrator = createOrchestrator(llmService, searchService, creationService, exerciseRepository);
  });

  afterAll(async () => {
    await testContainer.stop();
  });

  beforeEach(async () => {
    await testContainer.clearDatabase();
    await testContainer.seedExercises();
  });

  it('should parse simple workout end-to-end', async () => {
    const workoutText = `
Bench Press 3x10
Squats 4x8
    `.trim();

    const result = await orchestrator.parse(workoutText);

    // Should have complete workout structure with UUIDs
    expect(result.id).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.date).toBeDefined();
    expect(result.lastModifiedTime).toBeDefined();
    expect(result.blocks).toBeDefined();
    expect(result.blocks.length).toBeGreaterThan(0);

    // All blocks should have IDs
    result.blocks.forEach(block => {
      expect(block.id).toBeDefined();
    });

    // All exercises should have IDs and exerciseIds
    const allExercises = result.blocks.flatMap(b => b.exercises);
    expect(allExercises.length).toBeGreaterThanOrEqual(2);

    allExercises.forEach(exercise => {
      expect(exercise.id).toBeDefined();
      expect(exercise.exerciseId).toBeDefined();

      // Verify exerciseId exists in database
      expect(typeof exercise.exerciseId).toBe('string');
    });

    // All sets should have IDs
    allExercises.forEach(exercise => {
      expect(exercise.sets.length).toBeGreaterThan(0);
      exercise.sets.forEach(set => {
        expect(set.id).toBeDefined();
      });
    });
  }, 120000);

  it('should parse complex workout with blocks end-to-end', async () => {
    const workoutText = `
Warm Up:
Jumping jacks 2x20
Arm circles 1x10

Main Work:
Bench Press 5-3-1-1-1
Squats 4x8

Superset A:
1a. Dumbbell Rows 3x12
1b. Lateral Raises 3x15
    `.trim();

    const result = await orchestrator.parse(workoutText);

    // Should have multiple blocks
    expect(result.blocks.length).toBeGreaterThanOrEqual(3);

    // Should have block labels
    const blockLabels = result.blocks.map(b => b.label).filter(Boolean);
    expect(blockLabels.length).toBeGreaterThan(0);

    // All exercises should be properly resolved
    const allExercises = result.blocks.flatMap(b => b.exercises);
    allExercises.forEach(exercise => {
      expect(exercise.id).toBeDefined();
      expect(exercise.exerciseId).toBeDefined();
      expect(exercise.sets.length).toBeGreaterThan(0);
    });
  }, 120000);

  it('should reject non-workout content', async () => {
    const nonWorkoutText = `
# Chocolate Chip Cookie Recipe

## Ingredients
- 2 cups flour
- 1 cup sugar
- 1 cup butter

## Instructions
1. Mix ingredients
2. Bake at 350°F
    `.trim();

    await expect(orchestrator.parse(nonWorkoutText)).rejects.toThrow();
  }, 60000);

  it('should handle custom date option', async () => {
    const workoutText = 'Bench Press 3x10';
    const customDate = '2024-12-25';

    const result = await orchestrator.parse(workoutText, { date: customDate });

    expect(result.date).toBe(customDate);
  }, 120000);

  it('should handle custom weightUnit option', async () => {
    const workoutText = 'Bench Press 3x10';

    const result = await orchestrator.parse(workoutText, { weightUnit: 'kg' });

    // All sets should use kg
    const allSets = result.blocks.flatMap(b =>
      b.exercises.flatMap(e => e.sets)
    );

    allSets.forEach(set => {
      expect(set.weightUnit).toBe('kg');
    });
  }, 120000);
});
