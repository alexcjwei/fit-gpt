import { Router } from 'express';
import { Kysely } from 'kysely';
// import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { injectDatabase } from '../middleware/database';
import { Database } from '../db/types';

export function createUserRoutes(db: Kysely<Database>): Router {
  const router = Router();

  // Inject database and authentication
  router.use(injectDatabase(db));
  router.use(authenticate);

  // Validation middleware (uncomment when implementing controllers)
  // const updateProfileValidation = [
  //   body('name').optional().trim().notEmpty(),
  //   body('fitnessLevel').optional().isIn(['sedentary', 'lightly_active', 'moderately_active', 'very_active']),
  //   body('goals').optional().isArray(),
  //   body('preferredWorkoutDays').optional().isInt({ min: 1, max: 7 }),
  //   body('workoutLocation').optional().isIn(['home', 'gym', 'both']),
  // ];

  // Routes will be implemented in controllers
  // router.get('/profile', userController.getProfile);
  // router.put('/profile', updateProfileValidation, userController.updateProfile);
  // router.delete('/account', userController.deleteAccount);

  return router;
}
