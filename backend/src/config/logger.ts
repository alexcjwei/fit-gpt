import pino from 'pino';
import { env, isDevelopment, isTest } from './env';

/**
 * Pino Logger Configuration
 * Configured for Railway deployment with JSON output in production
 * and pretty-printed output in development
 * Silent during tests to reduce noise
 */

export const logger = pino({
  // Silent in tests, debug in dev, info in production
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : isDevelopment ? 'debug' : 'info'),

  // Format level as string (not number) for better Railway compatibility
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },

  // Pretty printing in development, JSON in production (Railway parses JSON automatically)
  ...(isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),

  // Base context for all logs
  base: {
    env: env.NODE_ENV,
  },
});

/**
 * Create a child logger with additional context
 * @param context - Additional context to add to all logs
 * @returns Child logger instance
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Audit logger specifically for security events
 * Includes 'audit' tag for easy filtering in log aggregation systems
 */
export const auditLogger = logger.child({ service: 'audit' });
