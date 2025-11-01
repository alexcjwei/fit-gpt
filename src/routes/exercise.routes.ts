import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth';
import * as exerciseController from '../controllers/exercise.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation middleware
const listExercisesValidation = [
  query('category')
    .optional()
    .isIn(['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'olympic', 'full-body', 'stretching'])
    .withMessage('Invalid category'),
  query('muscleGroup')
    .optional()
    .isIn(['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'abs', 'obliques', 'lower-back', 'upper-back', 'calves', 'forearms', 'traps', 'lats', 'rear-delts', 'hip-flexors'])
    .withMessage('Invalid muscle group'),
  query('equipment')
    .optional()
    .isIn(['barbell', 'dumbbell', 'cable', 'bodyweight', 'machine', 'bands', 'kettlebell', 'smith-machine', 'trap-bar', 'ez-bar', 'plate', 'medicine-ball', 'ab-wheel', 'suspension', 'sled', 'box', 'bench', 'pull-up-bar', 'dip-bar', 'cardio-machine'])
    .withMessage('Invalid equipment'),
  query('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Invalid difficulty level'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query too long'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
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
    .custom((value) => {
      // Accept either MongoDB ObjectId or slug format
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(value);
      const isSlug = /^[a-z0-9-]+$/.test(value);
      if (!isObjectId && !isSlug) {
        throw new Error('Must be a valid MongoDB ID or slug');
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
    .isIn(['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'olympic', 'full-body', 'stretching'])
    .withMessage('Invalid category'),
  body('primaryMuscles')
    .isArray({ min: 1 })
    .withMessage('At least one primary muscle must be specified'),
  body('primaryMuscles.*')
    .isIn(['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'abs', 'obliques', 'lower-back', 'upper-back', 'calves', 'forearms', 'traps', 'lats', 'rear-delts', 'hip-flexors'])
    .withMessage('Invalid primary muscle'),
  body('secondaryMuscles')
    .optional()
    .isArray()
    .withMessage('Secondary muscles must be an array'),
  body('secondaryMuscles.*')
    .isIn(['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'abs', 'obliques', 'lower-back', 'upper-back', 'calves', 'forearms', 'traps', 'lats', 'rear-delts', 'hip-flexors'])
    .withMessage('Invalid secondary muscle'),
  body('equipment')
    .isArray({ min: 1 })
    .withMessage('At least one equipment type must be specified'),
  body('equipment.*')
    .isIn(['barbell', 'dumbbell', 'cable', 'bodyweight', 'machine', 'bands', 'kettlebell', 'smith-machine', 'trap-bar', 'ez-bar', 'plate', 'medicine-ball', 'ab-wheel', 'suspension', 'sled', 'box', 'bench', 'pull-up-bar', 'dip-bar', 'cardio-machine'])
    .withMessage('Invalid equipment type'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Invalid difficulty level'),
  body('movementPattern')
    .optional()
    .isIn(['push', 'pull', 'squat', 'hinge', 'lunge', 'carry', 'rotation', 'anti-rotation', 'isometric', 'plyometric', 'olympic'])
    .withMessage('Invalid movement pattern'),
  body('isUnilateral')
    .optional()
    .isBoolean()
    .withMessage('isUnilateral must be a boolean'),
  body('isCompound')
    .optional()
    .isBoolean()
    .withMessage('isCompound must be a boolean'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description too long'),
  body('setupInstructions')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Setup instructions too long'),
  body('formCues')
    .optional()
    .isArray()
    .withMessage('Form cues must be an array'),
  body('formCues.*')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Form cue too long'),
  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('Invalid video URL'),
  body('alternativeExerciseIds')
    .optional()
    .isArray()
    .withMessage('Alternative exercise IDs must be an array'),
  body('alternativeExerciseIds.*')
    .isMongoId()
    .withMessage('Invalid alternative exercise ID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tag too long'),
];

const updateExerciseValidation = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Exercise ID or slug is required')
    .custom((value) => {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(value);
      const isSlug = /^[a-z0-9-]+$/.test(value);
      if (!isObjectId && !isSlug) {
        throw new Error('Must be a valid MongoDB ID or slug');
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
    .isIn(['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'olympic', 'full-body', 'stretching'])
    .withMessage('Invalid category'),
  body('primaryMuscles')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one primary muscle must be specified'),
  body('primaryMuscles.*')
    .optional()
    .isIn(['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'abs', 'obliques', 'lower-back', 'upper-back', 'calves', 'forearms', 'traps', 'lats', 'rear-delts', 'hip-flexors'])
    .withMessage('Invalid primary muscle'),
  body('secondaryMuscles')
    .optional()
    .isArray()
    .withMessage('Secondary muscles must be an array'),
  body('secondaryMuscles.*')
    .optional()
    .isIn(['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'abs', 'obliques', 'lower-back', 'upper-back', 'calves', 'forearms', 'traps', 'lats', 'rear-delts', 'hip-flexors'])
    .withMessage('Invalid secondary muscle'),
  body('equipment')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one equipment type must be specified'),
  body('equipment.*')
    .optional()
    .isIn(['barbell', 'dumbbell', 'cable', 'bodyweight', 'machine', 'bands', 'kettlebell', 'smith-machine', 'trap-bar', 'ez-bar', 'plate', 'medicine-ball', 'ab-wheel', 'suspension', 'sled', 'box', 'bench', 'pull-up-bar', 'dip-bar', 'cardio-machine'])
    .withMessage('Invalid equipment type'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Invalid difficulty level'),
  body('movementPattern')
    .optional()
    .isIn(['push', 'pull', 'squat', 'hinge', 'lunge', 'carry', 'rotation', 'anti-rotation', 'isometric', 'plyometric', 'olympic'])
    .withMessage('Invalid movement pattern'),
  body('isUnilateral')
    .optional()
    .isBoolean()
    .withMessage('isUnilateral must be a boolean'),
  body('isCompound')
    .optional()
    .isBoolean()
    .withMessage('isCompound must be a boolean'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description too long'),
  body('setupInstructions')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Setup instructions too long'),
  body('formCues')
    .optional()
    .isArray()
    .withMessage('Form cues must be an array'),
  body('formCues.*')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Form cue too long'),
  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('Invalid video URL'),
  body('alternativeExerciseIds')
    .optional()
    .isArray()
    .withMessage('Alternative exercise IDs must be an array'),
  body('alternativeExerciseIds.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid alternative exercise ID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tag too long'),
];

const deleteExerciseValidation = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Exercise ID or slug is required')
    .custom((value) => {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(value);
      const isSlug = /^[a-z0-9-]+$/.test(value);
      if (!isObjectId && !isSlug) {
        throw new Error('Must be a valid MongoDB ID or slug');
      }
      return true;
    }),
];

// Routes
router.get('/', listExercisesValidation, exerciseController.getExercises);
router.get('/:id', getExerciseValidation, exerciseController.getExercise);
router.post('/', createExerciseValidation, exerciseController.createNewExercise);
router.put('/:id', updateExerciseValidation, exerciseController.updateExistingExercise);
router.delete('/:id', deleteExerciseValidation, exerciseController.deleteExistingExercise);

export default router;
