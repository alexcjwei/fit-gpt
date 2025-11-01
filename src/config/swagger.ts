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
          properties: {
            _id: { type: 'string' },
            workoutId: { type: 'string' },
            name: { type: 'string' },
            sets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  reps: { type: 'number' },
                  weight: { type: 'number' },
                  duration: { type: 'number', description: 'Duration in seconds' },
                  distance: { type: 'number', description: 'Distance in meters' },
                  completed: { type: 'boolean' },
                  perceivedDifficulty: { type: 'number', minimum: 1, maximum: 10 },
                },
              },
            },
            restPeriod: { type: 'number', description: 'Rest period in seconds' },
            notes: { type: 'string' },
            order: { type: 'number' },
            supersetGroup: { type: 'number' },
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
