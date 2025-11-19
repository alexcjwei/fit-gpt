import { TestContainer } from '../../../utils/testContainer';
import { createOrchestrator, type Orchestrator } from '../../../../src/services/workoutParser/orchestrator';
import { LLMService } from '../../../../src/services/llm.service';
import { createExerciseSearchService } from '../../../../src/services/exerciseSearch.service';
import { createExerciseCreationService } from '../../../../src/services/exerciseCreation.service';
import { createExerciseRepository } from '../../../../src/repositories/ExerciseRepository';

/**
 * Orchestrator Integration Test - Sanity Check
 *
 * This test provides end-to-end validation of the workout parser pipeline.
 * It's designed as a sanity check rather than comprehensive coverage.
 *
 * For detailed evaluation of parsing accuracy, use a separate evaluation dataset.
 */
describe('Orchestrator - Integration Sanity Check', () => {
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

  it('should parse realistic workout with various exercise formats end-to-end', async () => {
    // Realistic workout covering common patterns:
    // - Time-based warmup (Jogging)
    // - Varying rep scheme (5-3-1-1-1)
    // - Standard sets (3x5)
    // - Superset with time-based and unilateral exercises
    const workoutText = `
Warmup:
Jogging 5 min

Main Lift:
Barbell Back Squat 5-3-1-1-1

Deadlift 3x5

Core:
1a. Side Plank 3x30sec
1b. Dead Bug three sets of 10 each side
    `.trim();

    const result = await orchestrator.parse(workoutText);

    // Verify basic workout structure
    expect(result.id).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.date).toBeDefined();
    expect(result.lastModifiedTime).toBeDefined();
    expect(result.blocks).toBeDefined();
    expect(result.blocks.length).toBeGreaterThanOrEqual(3); // Warmup, Main Lift, Core

    // Verify all blocks have IDs
    result.blocks.forEach(block => {
      expect(block.id).toBeDefined();
    });

    // Verify exercises were resolved and have IDs
    const allExercises = result.blocks.flatMap(b => b.exercises);
    expect(allExercises.length).toBeGreaterThanOrEqual(4); // Jogging, Squat, Deadlift, Side Plank, Dead Bug

    allExercises.forEach(exercise => {
      expect(exercise.id).toBeDefined();
      expect(exercise.exerciseId).toBeDefined();
      expect(typeof exercise.exerciseId).toBe('string');
      expect(exercise.exerciseId).toBeTruthy();
    });

    // Verify all sets have IDs and basic structure
    allExercises.forEach(exercise => {
      expect(exercise.sets.length).toBeGreaterThan(0);
      exercise.sets.forEach(set => {
        expect(set.id).toBeDefined();
        expect(set.setNumber).toBeGreaterThan(0);
        expect(set.weightUnit).toMatch(/^(lbs|kg)$/);
      });
    });

    // Verify varying rep scheme was parsed correctly (Squat: 5-3-1-1-1 = 5 sets)
    const squatExercise = allExercises.find(ex =>
      ex.prescription?.toLowerCase().includes('5') &&
      ex.prescription?.toLowerCase().includes('1')
    );
    expect(squatExercise?.sets.length).toBe(5);

    // Verify standard sets were parsed correctly (Deadlift: 3x5 = 3 sets)
    const deadliftExercise = allExercises.find(ex =>
      ex.prescription?.match(/^3\s*x/i) && // Starts with "3x" or "3 x"
      !ex.prescription?.toLowerCase().includes('30sec')
    );
    expect(deadliftExercise?.sets.length).toBe(3);

    // Verify block labels exist for structured workout
    const blockLabels = result.blocks.map(b => b.label).filter(Boolean);
    expect(blockLabels.length).toBeGreaterThan(0);
  }, 120000); // 2 min timeout for LLM API calls
});
