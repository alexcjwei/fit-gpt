import { Router } from 'express';
// import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
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

export default router;
