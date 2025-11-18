import { Router } from 'express';
import { Kysely } from 'kysely';
import { Database } from '../db/types';
import { createAuthRoutes } from './auth.routes';
import { createUserRoutes } from './user.routes';
import { createWorkoutRoutes } from './workout.routes';
import { createExerciseRoutes } from './exercise.routes';

export function createRoutes(db: Kysely<Database>): Router {
  const router = Router();

  router.use('/auth', createAuthRoutes(db));
  router.use('/users', createUserRoutes(db));
  router.use('/workouts', createWorkoutRoutes(db));
  router.use('/exercises', createExerciseRoutes(db));

  return router;
}
