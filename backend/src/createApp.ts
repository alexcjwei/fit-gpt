import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { Kysely } from 'kysely';
import { Database } from './db/types';
import { env, isDevelopment } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { createAuthLimiter, createLlmLimiter, createApiLimiter } from './middleware/rateLimiter';
import { swaggerSpec } from './config/swagger';
import { createRoutes } from './routes';
import { createUserRepository } from './repositories/UserRepository';
import { createExerciseRepository } from './repositories/ExerciseRepository';
import { createWorkoutRepository } from './repositories/WorkoutRepository';
import { createAuthService } from './services/auth.service';
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
 * @param skipRateLimiting - Optional flag to skip rate limiting (useful for tests)
 * @returns Configured Express application
 */
export function createApp(
  db: Kysely<Database>,
  redisClient?: Redis | null,
  skipRateLimiting?: boolean
): Application {
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

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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

  // Layer 2: Services (Business Logic)
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
  const authController = createAuthController(authService);
  const exerciseController = createExerciseController(exerciseService, exerciseSearchService);
  const workoutController = createWorkoutController(workoutService);
  const workoutParserController = createWorkoutParserController(workoutService, workoutParserService);

  // Rate Limiters (create fresh instances for this app, or use no-op for tests)
  // No-op middleware that does nothing (for tests)
  const noopMiddleware = (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next();

  const authLimiter = skipRateLimiting ? noopMiddleware : createAuthLimiter();
  const llmLimiter = skipRateLimiting ? noopMiddleware : createLlmLimiter();
  const apiLimiter = skipRateLimiting ? noopMiddleware : createApiLimiter();

  // Layer 4: Routes (API Endpoints)
  const routes = createRoutes(
    authController,
    exerciseController,
    workoutController,
    workoutParserController,
    authLimiter,
    llmLimiter
  );

  // Apply general rate limiting to all API routes
  app.use('/api', apiLimiter);

  // Mount API routes
  app.use('/api', routes);

  // 404 handler
  app.use(notFound);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
