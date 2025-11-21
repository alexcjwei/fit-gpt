import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { Kysely } from 'kysely';
import { Database } from './db/types';
import { env, isDevelopment } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { swaggerSpec } from './config/swagger';
import { createRoutes } from './routes';
import { createUserRepository } from './repositories/UserRepository';
import { createExerciseRepository } from './repositories/ExerciseRepository';
import { createWorkoutRepository } from './repositories/WorkoutRepository';
import { createAuditRepository } from './repositories/AuditRepository';
import { createAuthService } from './services/auth.service';
import { createAuditService } from './services/audit.service';
import { createExerciseService } from './services/exercise.service';
import { createExerciseSearchService } from './services/exerciseSearch.service';
import { createExerciseCreationService } from './services/exerciseCreation.service';
import { createWorkoutService } from './services/workout.service';
import { createOrchestrator } from './services/workoutParser/orchestrator';
import { LLMService } from './services/llm.service';
import { createEmbeddingService } from './services/embedding.service';
import { createAuthController } from './controllers/auth.controller';
import { createExerciseController } from './controllers/exercise.controller';
import { createWorkoutController } from './controllers/workout.controller';
import { createWorkoutParserController } from './controllers/workoutParser.controller';
import { createExerciseCacheService } from './services/exerciseCache.service';
import { getRedisClient } from './config/redis';
import type Redis from 'ioredis';

/**
 * Create and configure an Express application with dependency injection
 * This is the composition root where all dependencies are wired together
 *
 * @param db - Kysely database instance to inject
 * @param redisClient - Optional Redis client for caching (defaults to global instance)
 * @returns Configured Express application
 */
export function createApp(db: Kysely<Database>, redisClient?: Redis | null): Application {
  const app: Application = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  // Support multiple origins for production (comma-separated) and Expo Go
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (origin === undefined || origin === null) {
          return callback(null, true);
        }

        // Allow Expo Go URLs (exp://)
        if (origin.startsWith('exp://')) {
          return callback(null, true);
        }

        // Allow configured origins
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // Body parsing middleware with size limits to prevent DoS attacks (VULN-007)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Logging middleware
  if (isDevelopment) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // API Documentation
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'Gen Workout API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
    })
  );

  // Swagger JSON endpoint
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // ============================================
  // Dependency Injection: Wire up the layers
  // ============================================

  // Get Redis client (or use provided one for testing)
  const redis = redisClient !== undefined ? redisClient : getRedisClient();

  // Layer 1: Repositories (Data Access)
  const userRepository = createUserRepository(db);
  const exerciseRepository = createExerciseRepository(db);
  const workoutRepository = createWorkoutRepository(db);
  const auditRepository = createAuditRepository(db);

  // Layer 2: Services (Business Logic)
  const auditService = createAuditService(auditRepository);
  const authService = createAuthService(userRepository);
  const exerciseService = createExerciseService(exerciseRepository);
  const llmService = new LLMService();
  const exerciseCacheService = createExerciseCacheService(redis, exerciseRepository);
  const embeddingService = createEmbeddingService();
  const exerciseSearchService = createExerciseSearchService(exerciseRepository, embeddingService, exerciseCacheService);
  const workoutService = createWorkoutService(workoutRepository, exerciseRepository);
  const exerciseCreationService = createExerciseCreationService(exerciseRepository, llmService, embeddingService);
  const workoutParserService = createOrchestrator(
    llmService,
    exerciseSearchService,
    exerciseCreationService
  );

  // Layer 3: Controllers (HTTP Handlers)
  const authController = createAuthController(authService, auditService);
  const exerciseController = createExerciseController(exerciseService, exerciseSearchService);
  const workoutController = createWorkoutController(workoutService);
  const workoutParserController = createWorkoutParserController(workoutService, workoutParserService);

  // Layer 4: Routes (API Endpoints)
  const routes = createRoutes(
    authController,
    exerciseController,
    workoutController,
    workoutParserController
  );

  // Mount API routes
  app.use('/api', routes);

  // 404 handler
  app.use(notFound);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
