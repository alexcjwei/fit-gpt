import { Router } from 'express';
// import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation middleware (uncomment when implementing controllers)
// const createExerciseValidation = [
//   body('workoutId').isMongoId(),
//   body('name').trim().notEmpty(),
//   body('sets').optional().isArray(),
//   body('restPeriod').optional().isInt({ min: 0 }),
//   body('order').optional().isInt({ min: 0 }),
// ];

// const updateExerciseValidation = [
//   param('id').isMongoId(),
//   body('name').optional().trim().notEmpty(),
//   body('sets').optional().isArray(),
//   body('restPeriod').optional().isInt({ min: 0 }),
// ];

// Routes will be implemented in controllers
// router.get('/workout/:workoutId', param('workoutId').isMongoId(), exerciseController.getExercisesByWorkout);
// router.get('/:id', param('id').isMongoId(), exerciseController.getExercise);
// router.post('/', createExerciseValidation, exerciseController.createExercise);
// router.put('/:id', updateExerciseValidation, exerciseController.updateExercise);
// router.delete('/:id', param('id').isMongoId(), exerciseController.deleteExercise);
// router.put('/:id/sets/:setIndex', exerciseController.updateSet);

export default router;
