/**
 * Workout Parser Service - Now using the new Orchestrator implementation
 * Re-exporting orchestrator as the main parser service for backwards compatibility
 */
export { createOrchestrator as createWorkoutParserService, type Orchestrator as WorkoutParserService, type OrchestratorOptions as WorkoutParserOptions } from './orchestrator';
