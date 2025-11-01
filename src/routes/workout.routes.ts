import { Router } from 'express';
// import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation middleware (uncomment when implementing controllers)
// const createWorkoutValidation = [
//   body('title').trim().notEmpty(),
//   body('description').optional().trim(),
//   body('scheduledDate').optional().isISO8601(),
// ];

// const updateWorkoutValidation = [
//   param('id').isMongoId(),
//   body('title').optional().trim().notEmpty(),
//   body('status').optional().isIn(['planned', 'in_progress', 'completed', 'skipped']),
//   body('overallDifficulty').optional().isInt({ min: 1, max: 10 }),
// ];

/**
 * @swagger
 * /api/workouts:
 *   get:
 *     summary: Get all workouts for the authenticated user
 *     tags: [Workouts]
 *     responses:
 *       200:
 *         description: List of workouts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Workout'
 */
// router.get('/', workoutController.getWorkouts);

/**
 * @swagger
 * /api/workouts/{id}:
 *   get:
 *     summary: Get a specific workout
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workout ID
 *     responses:
 *       200:
 *         description: Workout details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       404:
 *         description: Workout not found
 */
// router.get('/:id', param('id').isMongoId(), workoutController.getWorkout);

/**
 * @swagger
 * /api/workouts:
 *   post:
 *     summary: Create a new workout
 *     tags: [Workouts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Upper Body Strength
 *               description:
 *                 type: string
 *                 example: Focus on chest and back
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Workout created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// router.post('/', createWorkoutValidation, workoutController.createWorkout);

/**
 * @swagger
 * /api/workouts/{id}:
 *   put:
 *     summary: Update a workout
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [planned, in_progress, completed, skipped]
 *               overallDifficulty:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Workout updated
 */
// router.put('/:id', updateWorkoutValidation, workoutController.updateWorkout);

/**
 * @swagger
 * /api/workouts/{id}:
 *   delete:
 *     summary: Delete a workout
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workout deleted
 */
// router.delete('/:id', param('id').isMongoId(), workoutController.deleteWorkout);

/**
 * @swagger
 * /api/workouts/{id}/start:
 *   post:
 *     summary: Start a workout (begins timer)
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workout started
 */
// router.post('/:id/start', param('id').isMongoId(), workoutController.startWorkout);

/**
 * @swagger
 * /api/workouts/{id}/complete:
 *   post:
 *     summary: Complete a workout (ends timer)
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workout completed
 */
// router.post('/:id/complete', param('id').isMongoId(), workoutController.completeWorkout);

export default router;
