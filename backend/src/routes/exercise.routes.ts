import { Router } from 'express';
import { Kysely } from 'kysely';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { injectDatabase } from '../middleware/database';
import { Database } from '../db/types';
import * as exerciseController from '../controllers/exercise.controller';

export function createExerciseRoutes(db: Kysely<Database>): Router {
  const router = Router();

  // Inject database and authentication
  router.use(injectDatabase(db));
  router.use(authenticate);

// Validation middleware
const listExercisesValidation = [
  query('category')
    .optional()
    .isIn([
      'chest',
      'back',
      'legs',
      'shoulders',
      'arms',
      'core',
      'cardio',
      'olympic',
      'full-body',
      'stretching',
    ])
    .withMessage('Invalid category'),
  query('muscleGroup')
    .optional()
    .isIn([
      'chest',
      'back',
      'quads',
      'hamstrings',
      'glutes',
      'shoulders',
      'biceps',
      'triceps',
      'abs',
      'obliques',
      'lower-back',
      'upper-back',
      'calves',
      'forearms',
      'traps',
      'lats',
      'rear-delts',
      'hip-flexors',
    ])
    .withMessage('Invalid muscle group'),
  query('equipment')
    .optional()
    .isIn([
      'barbell',
      'dumbbell',
      'cable',
      'bodyweight',
      'machine',
      'bands',
      'kettlebell',
      'smith-machine',
      'trap-bar',
      'ez-bar',
      'plate',
      'medicine-ball',
      'ab-wheel',
      'suspension',
      'sled',
      'box',
      'bench',
      'pull-up-bar',
      'dip-bar',
      'cardio-machine',
    ])
    .withMessage('Invalid equipment'),
  query('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Invalid difficulty level'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search query too long'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const getExerciseValidation = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Exercise ID or slug is required')
    .custom((value: string) => {
      // Accept either PostgreSQL bigint (numeric string) or slug format
      const isBigInt = /^\d+$/.test(value);
      const isSlug = /^[a-z0-9-]+$/.test(value);
      if (!isBigInt && !isSlug) {
        throw new Error('Must be a valid numeric ID or slug');
      }
      return true;
    }),
];

const createExerciseValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Exercise name is required')
    .isLength({ max: 100 })
    .withMessage('Exercise name too long'),
  body('slug')
    .optional()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
    .isLength({ max: 100 })
    .withMessage('Slug too long'),
  body('category')
    .isIn([
      'chest',
      'back',
      'legs',
      'shoulders',
      'arms',
      'core',
      'cardio',
      'olympic',
      'full-body',
      'stretching',
    ])
    .withMessage('Invalid category'),
  body('primaryMuscles')
    .isArray({ min: 1 })
    .withMessage('At least one primary muscle must be specified'),
  body('primaryMuscles.*')
    .isIn([
      'chest',
      'back',
      'quads',
      'hamstrings',
      'glutes',
      'shoulders',
      'biceps',
      'triceps',
      'abs',
      'obliques',
      'lower-back',
      'upper-back',
      'calves',
      'forearms',
      'traps',
      'lats',
      'rear-delts',
      'hip-flexors',
    ])
    .withMessage('Invalid primary muscle'),
  body('secondaryMuscles').optional().isArray().withMessage('Secondary muscles must be an array'),
  body('secondaryMuscles.*')
    .isIn([
      'chest',
      'back',
      'quads',
      'hamstrings',
      'glutes',
      'shoulders',
      'biceps',
      'triceps',
      'abs',
      'obliques',
      'lower-back',
      'upper-back',
      'calves',
      'forearms',
      'traps',
      'lats',
      'rear-delts',
      'hip-flexors',
    ])
    .withMessage('Invalid secondary muscle'),
  body('equipment')
    .isArray({ min: 1 })
    .withMessage('At least one equipment type must be specified'),
  body('equipment.*')
    .isIn([
      'barbell',
      'dumbbell',
      'cable',
      'bodyweight',
      'machine',
      'bands',
      'kettlebell',
      'smith-machine',
      'trap-bar',
      'ez-bar',
      'plate',
      'medicine-ball',
      'ab-wheel',
      'suspension',
      'sled',
      'box',
      'bench',
      'pull-up-bar',
      'dip-bar',
      'cardio-machine',
    ])
    .withMessage('Invalid equipment type'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Invalid difficulty level'),
  body('movementPattern')
    .optional()
    .isIn([
      'push',
      'pull',
      'squat',
      'hinge',
      'lunge',
      'carry',
      'rotation',
      'anti-rotation',
      'isometric',
      'plyometric',
      'olympic',
    ])
    .withMessage('Invalid movement pattern'),
  body('isUnilateral').optional().isBoolean().withMessage('isUnilateral must be a boolean'),
  body('isCompound').optional().isBoolean().withMessage('isCompound must be a boolean'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('setupInstructions')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Setup instructions too long'),
  body('formCues').optional().isArray().withMessage('Form cues must be an array'),
  body('formCues.*').trim().isLength({ max: 200 }).withMessage('Form cue too long'),
  body('videoUrl').optional().isURL().withMessage('Invalid video URL'),
  body('alternativeExerciseIds')
    .optional()
    .isArray()
    .withMessage('Alternative exercise IDs must be an array'),
  body('alternativeExerciseIds.*').isMongoId().withMessage('Invalid alternative exercise ID'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').trim().isLength({ max: 50 }).withMessage('Tag too long'),
];

const updateExerciseValidation = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Exercise ID or slug is required')
    .custom((value: string) => {
      const isBigInt = /^\d+$/.test(value);
      const isSlug = /^[a-z0-9-]+$/.test(value);
      if (!isBigInt && !isSlug) {
        throw new Error('Must be a valid numeric ID or slug');
      }
      return true;
    }),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Exercise name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Exercise name too long'),
  body('slug')
    .optional()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
    .isLength({ max: 100 })
    .withMessage('Slug too long'),
  body('category')
    .optional()
    .isIn([
      'chest',
      'back',
      'legs',
      'shoulders',
      'arms',
      'core',
      'cardio',
      'olympic',
      'full-body',
      'stretching',
    ])
    .withMessage('Invalid category'),
  body('primaryMuscles')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one primary muscle must be specified'),
  body('primaryMuscles.*')
    .optional()
    .isIn([
      'chest',
      'back',
      'quads',
      'hamstrings',
      'glutes',
      'shoulders',
      'biceps',
      'triceps',
      'abs',
      'obliques',
      'lower-back',
      'upper-back',
      'calves',
      'forearms',
      'traps',
      'lats',
      'rear-delts',
      'hip-flexors',
    ])
    .withMessage('Invalid primary muscle'),
  body('secondaryMuscles').optional().isArray().withMessage('Secondary muscles must be an array'),
  body('secondaryMuscles.*')
    .optional()
    .isIn([
      'chest',
      'back',
      'quads',
      'hamstrings',
      'glutes',
      'shoulders',
      'biceps',
      'triceps',
      'abs',
      'obliques',
      'lower-back',
      'upper-back',
      'calves',
      'forearms',
      'traps',
      'lats',
      'rear-delts',
      'hip-flexors',
    ])
    .withMessage('Invalid secondary muscle'),
  body('equipment')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one equipment type must be specified'),
  body('equipment.*')
    .optional()
    .isIn([
      'barbell',
      'dumbbell',
      'cable',
      'bodyweight',
      'machine',
      'bands',
      'kettlebell',
      'smith-machine',
      'trap-bar',
      'ez-bar',
      'plate',
      'medicine-ball',
      'ab-wheel',
      'suspension',
      'sled',
      'box',
      'bench',
      'pull-up-bar',
      'dip-bar',
      'cardio-machine',
    ])
    .withMessage('Invalid equipment type'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Invalid difficulty level'),
  body('movementPattern')
    .optional()
    .isIn([
      'push',
      'pull',
      'squat',
      'hinge',
      'lunge',
      'carry',
      'rotation',
      'anti-rotation',
      'isometric',
      'plyometric',
      'olympic',
    ])
    .withMessage('Invalid movement pattern'),
  body('isUnilateral').optional().isBoolean().withMessage('isUnilateral must be a boolean'),
  body('isCompound').optional().isBoolean().withMessage('isCompound must be a boolean'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('setupInstructions')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Setup instructions too long'),
  body('formCues').optional().isArray().withMessage('Form cues must be an array'),
  body('formCues.*').optional().trim().isLength({ max: 200 }).withMessage('Form cue too long'),
  body('videoUrl').optional().isURL().withMessage('Invalid video URL'),
  body('alternativeExerciseIds')
    .optional()
    .isArray()
    .withMessage('Alternative exercise IDs must be an array'),
  body('alternativeExerciseIds.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid alternative exercise ID'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().trim().isLength({ max: 50 }).withMessage('Tag too long'),
];

const deleteExerciseValidation = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Exercise ID or slug is required')
    .custom((value: string) => {
      const isBigInt = /^\d+$/.test(value);
      const isSlug = /^[a-z0-9-]+$/.test(value);
      if (!isBigInt && !isSlug) {
        throw new Error('Must be a valid numeric ID or slug');
      }
      return true;
    }),
];

// Routes

/**
 * @swagger
 * /api/exercises/search:
 *   get:
 *     summary: Fuzzy search exercises by name
 *     description: |
 *       Searches exercises using PostgreSQL trigram similarity matching.
 *       Special characters (hyphens, slashes) are normalized to spaces for better matching.
 *       For example: "chin up" will match "Chin-up", "90 90 hip" will match "90/90 Hip Switch".
 *       Results are returned with their original display names intact.
 *     tags: [Exercises]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Search query for exercise name
 *         example: chin up
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 5
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: Search results with similarity scores
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
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           exercise:
 *                             $ref: '#/components/schemas/Exercise'
 *                           score:
 *                             type: number
 *                             description: Similarity score (0 = perfect match, 1 = worst match)
 *                             example: 0.1
 *       400:
 *         description: Invalid query parameters
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
router.get(
  '/search',
  [
    query('q')
      .trim()
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20'),
  ],
  exerciseController.searchExercises
);

/**
 * @swagger
 * /api/exercises:
 *   get:
 *     summary: List exercises with filtering and pagination
 *     tags: [Exercises]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [chest, back, legs, shoulders, arms, core, cardio, olympic, full-body, stretching]
 *         description: Filter by exercise category
 *       - in: query
 *         name: muscleGroup
 *         schema:
 *           type: string
 *           enum: [chest, back, quads, hamstrings, glutes, shoulders, biceps, triceps, abs, obliques, lower-back, upper-back, calves, forearms, traps, lats, rear-delts, hip-flexors]
 *         description: Filter by muscle group
 *       - in: query
 *         name: equipment
 *         schema:
 *           type: string
 *           enum: [barbell, dumbbell, cable, bodyweight, machine, bands, kettlebell, smith-machine, trap-bar, ez-bar, plate, medicine-ball, ab-wheel, suspension, sled, box, bench, pull-up-bar, dip-bar, cardio-machine]
 *         description: Filter by equipment type
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced, expert]
 *         description: Filter by difficulty level
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search exercises by name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of exercises per page
 *     responses:
 *       200:
 *         description: List of exercises
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
 *                     exercises:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Exercise'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       400:
 *         description: Invalid query parameters
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
router.get('/', listExercisesValidation, exerciseController.getExercises);

/**
 * @swagger
 * /api/exercises/{id}:
 *   get:
 *     summary: Get a single exercise by ID or slug
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exercise ID (numeric string) or slug (e.g., 'barbell-bench-press-flat')
 *         example: barbell-bench-press-flat
 *     responses:
 *       200:
 *         description: Exercise details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Exercise'
 *       400:
 *         description: Invalid ID or slug format
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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getExerciseValidation, exerciseController.getExercise);

/**
 * @swagger
 * /api/exercises:
 *   post:
 *     summary: Create a new exercise
 *     tags: [Exercises]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - primaryMuscles
 *               - equipment
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: Barbell Bench Press (Flat)
 *               slug:
 *                 type: string
 *                 maxLength: 100
 *                 pattern: ^[a-z0-9-]+$
 *                 example: barbell-bench-press-flat
 *                 description: Optional URL-friendly identifier (auto-generated if not provided)
 *               category:
 *                 type: string
 *                 enum: [chest, back, legs, shoulders, arms, core, cardio, olympic, full-body, stretching]
 *                 example: chest
 *               primaryMuscles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [chest, back, quads, hamstrings, glutes, shoulders, biceps, triceps, abs, obliques, lower-back, upper-back, calves, forearms, traps, lats, rear-delts, hip-flexors]
 *                 minItems: 1
 *                 example: [chest]
 *               secondaryMuscles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [chest, back, quads, hamstrings, glutes, shoulders, biceps, triceps, abs, obliques, lower-back, upper-back, calves, forearms, traps, lats, rear-delts, hip-flexors]
 *                 example: [triceps, shoulders]
 *               equipment:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [barbell, dumbbell, cable, bodyweight, machine, bands, kettlebell, smith-machine, trap-bar, ez-bar, plate, medicine-ball, ab-wheel, suspension, sled, box, bench, pull-up-bar, dip-bar, cardio-machine]
 *                 minItems: 1
 *                 example: [barbell, bench]
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced, expert]
 *                 example: intermediate
 *               movementPattern:
 *                 type: string
 *                 enum: [push, pull, squat, hinge, lunge, carry, rotation, anti-rotation, isometric, plyometric, olympic]
 *                 example: push
 *               isUnilateral:
 *                 type: boolean
 *                 example: false
 *               isCompound:
 *                 type: boolean
 *                 example: true
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               setupInstructions:
 *                 type: string
 *                 maxLength: 1000
 *               formCues:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 200
 *                 example: [Retract scapula, Maintain arch in lower back, Touch chest at nipple line]
 *               videoUrl:
 *                 type: string
 *                 format: uri
 *               alternativeExerciseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: PostgreSQL bigint as string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 example: [fundamental, strength]
 *     responses:
 *       201:
 *         description: Exercise created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Exercise'
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
 *       409:
 *         description: Exercise with this name or slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createExerciseValidation, exerciseController.createNewExercise);

/**
 * @swagger
 * /api/exercises/{id}:
 *   put:
 *     summary: Update an existing exercise
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exercise ID (numeric string) or slug
 *         example: barbell-bench-press-flat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: Barbell Bench Press (Flat)
 *               slug:
 *                 type: string
 *                 maxLength: 100
 *                 pattern: ^[a-z0-9-]+$
 *                 example: barbell-bench-press-flat
 *               category:
 *                 type: string
 *                 enum: [chest, back, legs, shoulders, arms, core, cardio, olympic, full-body, stretching]
 *                 example: chest
 *               primaryMuscles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [chest, back, quads, hamstrings, glutes, shoulders, biceps, triceps, abs, obliques, lower-back, upper-back, calves, forearms, traps, lats, rear-delts, hip-flexors]
 *                 minItems: 1
 *                 example: [chest]
 *               secondaryMuscles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [chest, back, quads, hamstrings, glutes, shoulders, biceps, triceps, abs, obliques, lower-back, upper-back, calves, forearms, traps, lats, rear-delts, hip-flexors]
 *                 example: [triceps, shoulders]
 *               equipment:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [barbell, dumbbell, cable, bodyweight, machine, bands, kettlebell, smith-machine, trap-bar, ez-bar, plate, medicine-ball, ab-wheel, suspension, sled, box, bench, pull-up-bar, dip-bar, cardio-machine]
 *                 minItems: 1
 *                 example: [barbell, bench]
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced, expert]
 *                 example: intermediate
 *               movementPattern:
 *                 type: string
 *                 enum: [push, pull, squat, hinge, lunge, carry, rotation, anti-rotation, isometric, plyometric, olympic]
 *                 example: push
 *               isUnilateral:
 *                 type: boolean
 *                 example: false
 *               isCompound:
 *                 type: boolean
 *                 example: true
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               setupInstructions:
 *                 type: string
 *                 maxLength: 1000
 *               formCues:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 200
 *                 example: [Retract scapula, Maintain arch in lower back]
 *               videoUrl:
 *                 type: string
 *                 format: uri
 *               alternativeExerciseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: PostgreSQL bigint as string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 example: [fundamental, strength]
 *     responses:
 *       200:
 *         description: Exercise updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Exercise'
 *       400:
 *         description: Validation error or invalid ID
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
 *         description: Exercise not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Exercise with this name or slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateExerciseValidation, exerciseController.updateExistingExercise);

/**
 * @swagger
 * /api/exercises/{id}:
 *   delete:
 *     summary: Delete an exercise
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exercise ID (numeric string) or slug
 *         example: barbell-bench-press-flat
 *     responses:
 *       200:
 *         description: Exercise deleted successfully
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
 *                   example: Exercise deleted successfully
 *       400:
 *         description: Invalid ID or slug format
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
 *         description: Exercise not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
  router.delete('/:id', deleteExerciseValidation, exerciseController.deleteExistingExercise);

  return router;
}
