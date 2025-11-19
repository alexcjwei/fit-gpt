import { Router } from 'express';
import { createAuthRoutes } from './auth.routes';
import userRoutes from './user.routes';
import { createWorkoutRoutes } from './workout.routes';
import { createExerciseRoutes } from './exercise.routes';
import type { AuthController } from '../controllers/auth.controller';
import type { ExerciseController } from '../controllers/exercise.controller';
import type { WorkoutController } from '../controllers/workout.controller';
import type { WorkoutParserController } from '../controllers/workoutParser.controller';

/**
 * Create API Routes with injected dependencies
 * Factory function pattern for dependency injection
 */
export function createRoutes(
  authController: AuthController,
  exerciseController: ExerciseController,
  workoutController: WorkoutController,
  workoutParserController: WorkoutParserController
) {
  const router = Router();

  const authRoutes = createAuthRoutes(authController);
  const exerciseRoutes = createExerciseRoutes(exerciseController);
  const workoutRoutes = createWorkoutRoutes(workoutController, workoutParserController);

  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/workouts', workoutRoutes);
  router.use('/exercises', exerciseRoutes);

  return router;
}
