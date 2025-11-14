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
            _id: { type: 'string', description: 'MongoDB ObjectId' },
            userId: { type: 'string', description: 'Reference to User' },
            name: { type: 'string', description: 'Workout name' },
            date: { type: 'string', format: 'date', description: 'Workout date (YYYY-MM-DD)' },
            lastModifiedTime: {
              type: 'string',
              format: 'date-time',
              description: 'Last modification timestamp',
            },
            notes: { type: 'string', description: 'Workout notes' },
            isTemplate: { type: 'boolean', description: 'Whether this is a template workout' },
            blocks: {
              type: 'array',
              description: 'Workout blocks containing exercises',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Unique block ID' },
                  notes: { type: 'string' },
                  exercises: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'Unique exercise instance ID' },
                        exerciseId: { type: 'string', description: 'Reference to Exercise model' },
                        exerciseName: {
                          type: 'string',
                          description: 'Resolved exercise name for display (populated by backend)',
                        },
                        orderInBlock: { type: 'integer', minimum: 0 },
                        prescription: {
                          type: 'string',
                          description:
                            'Exercise prescription (e.g., "3 x 8-10", "4 x 5 x 150 lbs")',
                        },
                        notes: { type: 'string' },
                        sets: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              setNumber: { type: 'integer', minimum: 1 },
                              reps: { type: 'integer', minimum: 0 },
                              weight: { type: 'number', minimum: 0 },
                              weightUnit: { type: 'string', enum: ['lbs', 'kg'] },
                              duration: {
                                type: 'integer',
                                minimum: 0,
                                description: 'Duration in seconds for time-based exercises',
                              },
                              rpe: {
                                type: 'number',
                                minimum: 1,
                                maximum: 10,
                                description: 'Rate of Perceived Exertion',
                              },
                              completed: { type: 'boolean' },
                              completedAt: { type: 'string', format: 'date-time' },
                              notes: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Exercise: {
          type: 'object',
          required: ['name', 'category', 'primaryMuscles', 'equipment'],
          properties: {
            _id: { type: 'string', description: 'MongoDB ObjectId' },
            slug: {
              type: 'string',
              description: 'URL-friendly identifier',
              example: 'barbell-bench-press-flat',
            },
            name: { type: 'string', example: 'Barbell Bench Press (Flat)' },
            category: {
              type: 'string',
              enum: [
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
              ],
              example: 'chest',
            },
            primaryMuscles: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
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
                ],
              },
              example: ['chest'],
            },
            secondaryMuscles: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
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
                ],
              },
              example: ['triceps', 'shoulders'],
            },
            equipment: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
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
                ],
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
              enum: [
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
              ],
              example: 'push',
            },
            isUnilateral: { type: 'boolean', example: false },
            isCompound: { type: 'boolean', example: true },
            description: { type: 'string', maxLength: 500 },
            setupInstructions: { type: 'string', maxLength: 1000 },
            formCues: {
              type: 'array',
              items: { type: 'string', maxLength: 200 },
              example: [
                'Retract scapula',
                'Maintain arch in lower back',
                'Bar path slightly diagonal',
              ],
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
