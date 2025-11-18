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
import routes from './routes';

/**
 * Create and configure an Express application with dependency injection
 * This is the composition root where all dependencies are wired together
 *
 * @param db - Kysely database instance to inject
 * @returns Configured Express application
 */
export function createApp(db: Kysely<Database>): Application {
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

  // API routes (will be refactored to use dependency injection)
  // TODO: Pass db through routes -> controllers -> services -> repositories
  app.use('/api', routes);

  // 404 handler
  app.use(notFound);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
