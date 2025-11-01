import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gen Workout API',
      version: '1.0.0',
      description: 'AI-integrated workout tracking API',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            fitnessLevel: {
              type: 'string',
              enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active'],
            },
            goals: { type: 'array', items: { type: 'string' } },
            injuries: { type: 'string' },
            exerciseHistory: { type: 'string' },
            preferredWorkoutDays: { type: 'number', minimum: 1, maximum: 7 },
            workoutLocation: { type: 'string', enum: ['home', 'gym', 'both'] },
            availableEquipment: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Workout: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: {
              type: 'string',
              enum: ['planned', 'in_progress', 'completed', 'skipped'],
            },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            totalDuration: { type: 'number', description: 'Duration in seconds' },
            scheduledDate: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
            overallDifficulty: { type: 'number', minimum: 1, maximum: 10 },
            aiGenerated: { type: 'boolean' },
            originalPrompt: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Exercise: {
          type: 'object',
          required: ['name', 'category', 'primaryMuscles', 'equipment'],
          properties: {
            _id: { type: 'string', description: 'MongoDB ObjectId' },
            slug: { type: 'string', description: 'URL-friendly identifier', example: 'barbell-bench-press-flat' },
            name: { type: 'string', example: 'Barbell Bench Press (Flat)' },
            category: {
              type: 'string',
              enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'olympic', 'full-body', 'stretching'],
              example: 'chest',
            },
            primaryMuscles: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'abs', 'obliques', 'lower-back', 'upper-back', 'calves', 'forearms', 'traps', 'lats', 'rear-delts', 'hip-flexors'],
              },
              example: ['chest'],
            },
            secondaryMuscles: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'abs', 'obliques', 'lower-back', 'upper-back', 'calves', 'forearms', 'traps', 'lats', 'rear-delts', 'hip-flexors'],
              },
              example: ['triceps', 'shoulders'],
            },
            equipment: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['barbell', 'dumbbell', 'cable', 'bodyweight', 'machine', 'bands', 'kettlebell', 'smith-machine', 'trap-bar', 'ez-bar', 'plate', 'medicine-ball', 'ab-wheel', 'suspension', 'sled', 'box', 'bench', 'pull-up-bar', 'dip-bar', 'cardio-machine'],
              },
              example: ['barbell', 'bench'],
            },
            difficulty: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'expert'],
              example: 'intermediate',
            },
            movementPattern: {
              type: 'string',
              enum: ['push', 'pull', 'squat', 'hinge', 'lunge', 'carry', 'rotation', 'anti-rotation', 'isometric', 'plyometric', 'olympic'],
              example: 'push',
            },
            isUnilateral: { type: 'boolean', example: false },
            isCompound: { type: 'boolean', example: true },
            description: { type: 'string', maxLength: 500 },
            setupInstructions: { type: 'string', maxLength: 1000 },
            formCues: {
              type: 'array',
              items: { type: 'string', maxLength: 200 },
              example: ['Retract scapula', 'Maintain arch in lower back', 'Bar path slightly diagonal'],
            },
            videoUrl: { type: 'string', format: 'uri' },
            alternativeExerciseIds: {
              type: 'array',
              items: { type: 'string' },
            },
            tags: {
              type: 'array',
              items: { type: 'string', maxLength: 50 },
              example: ['fundamental', 'strength'],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
