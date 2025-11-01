# Swagger Documentation Guide

## Overview

Swagger UI is now integrated at `http://localhost:3000/api-docs`. This guide shows you how to add documentation to your controllers.

## Adding Documentation to Routes

Documentation is added using JSDoc comments with `@swagger` tags. The configuration automatically scans `src/routes/*.ts` and `src/controllers/*.ts` files.

### Basic Example

```typescript
/**
 * @swagger
 * /api/workouts:
 *   get:
 *     summary: Get all workouts
 *     tags: [Workouts]
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/', workoutController.getWorkouts);
```

### With Authentication

Protected routes automatically require the Bearer token (configured in `src/config/swagger.ts`):

```typescript
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
 *         description: Workout ID
 *     requestBody:
 *       required: true
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
 *     responses:
 *       200:
 *         description: Workout updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Workout not found
 */
router.put('/:id', updateWorkoutValidation, workoutController.updateWorkout);
```

### Public Endpoints (No Auth Required)

Add `security: []` to override the global security requirement:

```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     security: []  # This makes the endpoint public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', loginValidation, authController.login);
```

## Available Schemas

Pre-configured schemas in `src/config/swagger.ts`:
- `User` - User model
- `Workout` - Workout model
- `Exercise` - Exercise model
- `Error` - Standard error response
- `Success` - Standard success response

Reference them with `$ref: '#/components/schemas/SchemaName'`

## Testing in Swagger UI

1. Start the server: `npm run dev`
2. Open `http://localhost:3000/api-docs`
3. Click "Authorize" button (top right)
4. Enter: `Bearer <your-jwt-token>`
5. Try out endpoints using "Try it out" buttons

## Adding New Schemas

Edit `src/config/swagger.ts` to add new component schemas:

```typescript
components: {
  schemas: {
    YourNewModel: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        // ... more properties
      },
    },
  },
}
```

## Tags for Organization

Use tags to group endpoints in the UI:
- `Authentication` - Auth endpoints
- `Users` - User management
- `Workouts` - Workout CRUD
- `Exercises` - Exercise management

Add more tags as needed for better organization.

## Example: Complete Controller Documentation

```typescript
// src/controllers/workout.controller.ts
import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { Workout } from '../models';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * @swagger
 * components:
 *   schemas:
 *     WorkoutInput:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           example: Upper Body Day
 *         description:
 *           type: string
 *           example: Focus on chest and triceps
 *         scheduledDate:
 *           type: string
 *           format: date-time
 */

export const createWorkout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const workout = await Workout.create({
      ...req.body,
      userId: req.userId,
    });

    res.status(201).json({
      success: true,
      data: workout,
    });
  }
);
```

## Tips

- Document as you code - easier than adding docs later
- Use examples in schemas for better UX
- Keep descriptions concise but informative
- Test endpoints in Swagger UI before writing frontend code
