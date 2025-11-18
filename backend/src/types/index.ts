// ============================================
// Re-exports from modular type files
// This maintains backward compatibility while organizing types
// ============================================

// Domain types
export type {
  AuthenticatedRequest,
  Workout,
  WorkoutBlock,
  ExerciseInstance,
  SetInstance,
  ExerciseInstanceResponse,
  WorkoutBlockResponse,
  WorkoutResponse,
  Exercise,
  User,
  UserWithPassword,
} from './domain';

export { isSetCompleted } from './domain';

// API types
export type {
  ApiResponse,
  PaginationOptions,
  PaginationMetadata,
  PaginatedResponse,
  WorkoutFilters,
  PaginatedWorkoutResponse,
  ExerciseFilters,
  PaginatedExerciseResponse,
  AuthResponse,
} from './api';

// Service types
export type {
  ExerciseSearchResult,
  ExerciseSearchOptions,
  ModelType,
  LLMOptions,
  LLMResponse,
  WorkoutParserOptions,
  ExerciseInstanceInput,
} from './services';

// Repository types
export type {
  CreateUserData,
  UpdateUserData,
  CreateExerciseData,
  UpdateExerciseData,
  CreateWorkoutData,
  CreateWorkoutBlockData,
  CreateExerciseInstanceData,
  CreateSetInstanceData,
  UpdateWorkoutData,
  UpdateWorkoutBlockData,
  UpdateExerciseInstanceData,
  UpdateSetInstanceData,
} from './repository';

// Validation types and schemas
export type {
  RegisterInput,
  LoginInput,
  CreateWorkout,
  UpdateWorkout,
  CreateExercise,
  UpdateExercise,
  CreateSetInstance,
  UpdateSetInstance,
  CreateExerciseInstance,
  CreateWorkoutBlock,
  ValidationResult,
  SetInstanceFromLLM,
  ExerciseInstanceFromLLM,
  WorkoutBlockFromLLM,
  WorkoutFromLLM,
  WorkoutWithPlaceholders,
  WorkoutBlockWithPlaceholders,
  ExerciseInstanceWithPlaceholder,
  SetInstanceWithoutId,
  ExerciseInstanceFromLLMWithId,
  WorkoutBlockFromLLMWithId,
  WorkoutFromLLMWithId,
  ExerciseInstanceFromLLMWithSlug,
  WorkoutBlockFromLLMWithSlug,
  WorkoutFromLLMWithSlug,
  WorkoutWithResolvedExercises,
  WorkoutBlockWithResolvedExercises,
  ExerciseInstanceWithoutId,
  FormattedWorkout,
} from './validation';

export {
  RegisterSchema,
  LoginSchema,
  SetInstanceSchema,
  CreateSetInstanceSchema,
  UpdateSetInstanceSchema,
  ExerciseInstanceSchema,
  CreateExerciseInstanceSchema,
  WorkoutBlockSchema,
  CreateWorkoutBlockSchema,
  WorkoutSchema,
  CreateWorkoutSchema,
  UpdateWorkoutSchema,
  ExerciseSchema,
  CreateExerciseSchema,
  UpdateExerciseSchema,
  PaginationOptionsSchema,
  WorkoutFiltersSchema,
  ExerciseFiltersSchema,
  SetInstanceFromLLMSchema,
  ExerciseInstanceFromLLMSchema,
  WorkoutBlockFromLLMSchema,
  WorkoutFromLLMSchema,
  ValidationResultSchema,
  SetInstanceWithoutIdSchema,
  ExerciseInstanceWithoutIdSchema,
  WorkoutBlockWithResolvedExercisesSchema,
  WorkoutWithResolvedExercisesSchema,
} from './validation';
