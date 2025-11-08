import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import {
  getWorkouts,
  getWorkout,
  createNewWorkout,
  updateExistingWorkout,
  deleteExistingWorkout,
  duplicateExistingWorkout,
  getWorkoutsByRange,
  addBlockToWorkout,
  removeBlockFromWorkout,
  reorderBlocksInWorkout,
  addExerciseToBlock,
  removeExerciseFromBlock,
  reorderExercisesInBlock,
  updateSetData,
  completeExistingSet,
} from '../controllers/workout.controller';
import { parseWorkout } from '../controllers/workoutParser.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// Workout Routes
// ============================================

/**
 * @swagger
 * /api/workouts/parse:
 *   post:
 *     summary: Parse workout text and save to database
 *     description: Parse unstructured workout text into a structured workout object, automatically save it to the database, and return the saved workout with resolved exercise names.
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Unstructured workout text to parse
 *                 example: |
 *                   ## Lower Body Strength + Power
 *
 *                   **Warm Up / Activation**
 *                   - Light cardio: 5 min
 *                   - Glute bridges: 2x15
 *
 *                   **Superset A (4 sets, 2-3 min rest)**
 *                   1. Back Squat: 6-8 reps
 *                   2. Box Jumps: 5 reps
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Workout date (ISO format YYYY-MM-DD). Defaults to today.
 *                 example: "2025-11-01"
 *               weightUnit:
 *                 type: string
 *                 enum: [lbs, kg]
 *                 description: Default weight unit. Defaults to lbs.
 *                 example: "lbs"
 *     responses:
 *       200:
 *         description: Successfully parsed and saved workout with resolved exercise names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Validation error or not valid workout content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error (LLM failure, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/parse',
  [
    body('text')
      .trim()
      .notEmpty()
      .withMessage('Workout text is required')
      .isLength({ min: 10 })
      .withMessage('Workout text must be at least 10 characters'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
    body('weightUnit')
      .optional()
      .isIn(['lbs', 'kg'])
      .withMessage('Weight unit must be either "lbs" or "kg"'),
  ],
  parseWorkout
);

/**
 * @swagger
 * /api/workouts/calendar:
 *   get:
 *     summary: Get workouts by date range for calendar view
 *     tags: [Workouts]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in ISO format (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in ISO format (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of workouts in date range
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/calendar', getWorkoutsByRange);

/**
 * @swagger
 * /api/workouts:
 *   get:
 *     summary: List all workouts for authenticated user
 *     tags: [Workouts]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter workouts from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter workouts until this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of workouts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     workouts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Workout'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getWorkouts);

/**
 * @swagger
 * /api/workouts/{id}:
 *   get:
 *     summary: Get a single workout by ID
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workout not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getWorkout);

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
 *               - name
 *               - date
 *               - lastModifiedTime
 *             properties:
 *               name:
 *                 type: string
 *                 example: Upper Body Day
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-11-01"
 *               lastModifiedTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-11-01T10:30:00Z"
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-11-01T10:00:00Z"
 *               notes:
 *                 type: string
 *                 example: Focus on progressive overload
 *               blocks:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Workout created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createNewWorkout);

/**
 * @swagger
 * /api/workouts/{id}:
 *   put:
 *     summary: Update an existing workout
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workout ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               lastModifiedTime:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Workout updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workout not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateExistingWorkout);

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
 *         description: Workout ID
 *     responses:
 *       200:
 *         description: Workout deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Workout deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workout not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteExistingWorkout);

/**
 * @swagger
 * /api/workouts/{id}/duplicate:
 *   post:
 *     summary: Duplicate an existing workout
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workout ID to duplicate
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-11-08"
 *                 description: Optional new date for the duplicated workout
 *     responses:
 *       201:
 *         description: Workout duplicated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workout not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/duplicate', duplicateExistingWorkout);

// ============================================
// Block Routes
// ============================================

/**
 * @swagger
 * /api/workouts/{workoutId}/blocks:
 *   post:
 *     summary: Add a new block to a workout
 *     tags: [Workout Blocks]
 *     parameters:
 *       - in: path
 *         name: workoutId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workout ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique block ID (client-generated)
 *               notes:
 *                 type: string
 *                 example: Superset these exercises
 *               exercises:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Block added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workout not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:workoutId/blocks', addBlockToWorkout);

/**
 * @swagger
 * /api/workouts/{workoutId}/blocks/reorder:
 *   put:
 *     summary: Reorder blocks within a workout
 *     tags: [Workout Blocks]
 *     parameters:
 *       - in: path
 *         name: workoutId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workout ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blockOrders
 *             properties:
 *               blockOrders:
 *                 type: array
 *                 description: Array of objects with blockId and order
 *                 items:
 *                   type: object
 *                   required:
 *                     - blockId
 *                     - order
 *                   properties:
 *                     blockId:
 *                       type: string
 *                     order:
 *                       type: integer
 *                       minimum: 0
 *     responses:
 *       200:
 *         description: Blocks reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Workout not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:workoutId/blocks/reorder', reorderBlocksInWorkout);

// ============================================
// Standalone resource routes
// ============================================

/**
 * @swagger
 * /api/workouts/blocks/{blockId}:
 *   delete:
 *     summary: Remove a block from a workout
 *     tags: [Workout Blocks]
 *     parameters:
 *       - in: path
 *         name: blockId
 *         required: true
 *         schema:
 *           type: string
 *         description: Block ID to remove
 *     responses:
 *       200:
 *         description: Block removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Block not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/blocks/:blockId', removeBlockFromWorkout);

/**
 * @swagger
 * /api/workouts/blocks/{blockId}/exercises:
 *   post:
 *     summary: Add an exercise to a block
 *     tags: [Workout Exercises]
 *     parameters:
 *       - in: path
 *         name: blockId
 *         required: true
 *         schema:
 *           type: string
 *         description: Block ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - exerciseId
 *               - orderInBlock
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique exercise instance ID (client-generated)
 *               exerciseId:
 *                 type: string
 *                 description: Reference to Exercise model
 *               orderInBlock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Position within the block
 *               notes:
 *                 type: string
 *                 example: Focus on form
 *               sets:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Exercise added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Block not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/blocks/:blockId/exercises', addExerciseToBlock);

/**
 * @swagger
 * /api/workouts/exercises/{exerciseId}:
 *   delete:
 *     summary: Remove an exercise from a block
 *     tags: [Workout Exercises]
 *     parameters:
 *       - in: path
 *         name: exerciseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Exercise instance ID to remove
 *     responses:
 *       200:
 *         description: Exercise removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Exercise not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/exercises/:exerciseId', removeExerciseFromBlock);

/**
 * @swagger
 * /api/workouts/blocks/{blockId}/exercises/reorder:
 *   put:
 *     summary: Reorder exercises within a block
 *     tags: [Workout Exercises]
 *     parameters:
 *       - in: path
 *         name: blockId
 *         required: true
 *         schema:
 *           type: string
 *         description: Block ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exerciseOrders
 *             properties:
 *               exerciseOrders:
 *                 type: array
 *                 description: Array of objects with exerciseId and order
 *                 items:
 *                   type: object
 *                   required:
 *                     - exerciseId
 *                     - order
 *                   properties:
 *                     exerciseId:
 *                       type: string
 *                     order:
 *                       type: integer
 *                       minimum: 0
 *     responses:
 *       200:
 *         description: Exercises reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Block not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/blocks/:blockId/exercises/reorder', reorderExercisesInBlock);

/**
 * @swagger
 * /api/workouts/sets/{setId}:
 *   put:
 *     summary: Update a set's data (weight, reps, etc.)
 *     tags: [Workout Sets]
 *     parameters:
 *       - in: path
 *         name: setId
 *         required: true
 *         schema:
 *           type: string
 *         description: Set ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reps:
 *                 type: integer
 *                 minimum: 0
 *               weight:
 *                 type: number
 *                 minimum: 0
 *               weightUnit:
 *                 type: string
 *                 enum: [lbs, kg]
 *               rpe:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *                 description: Rate of Perceived Exertion
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Set updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Set not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/sets/:setId', updateSetData);

/**
 * @swagger
 * /api/workouts/sets/{setId}/complete:
 *   post:
 *     summary: Mark a set as completed
 *     tags: [Workout Sets]
 *     parameters:
 *       - in: path
 *         name: setId
 *         required: true
 *         schema:
 *           type: string
 *         description: Set ID to complete
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reps:
 *                 type: integer
 *                 minimum: 0
 *               weight:
 *                 type: number
 *                 minimum: 0
 *               rpe:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Set completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workout'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Set not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/sets/:setId/complete', completeExistingSet);

export default router;
