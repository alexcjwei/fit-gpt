import { Request, Response, NextFunction } from 'express';
import { isDevelopment } from '../config/env';
import { logger } from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode =
    (err as AppError).statusCode !== undefined && (err as AppError).statusCode !== 0
      ? (err as AppError).statusCode
      : 500;
  const message =
    err.message !== undefined && err.message !== '' ? err.message : 'Internal Server Error';

  const errorResponse: {
    success: boolean;
    error: string;
    stack?: string;
  } = {
    success: false,
    error: message,
  };

  if (isDevelopment) {
    errorResponse.stack = err.stack;
  }

  // Log error using Pino with appropriate severity
  const logContext = {
    message: err.message,
    stack: err.stack,
    statusCode,
    path: _req.path,
    method: _req.method,
  };

  // Log at different levels based on status code
  if (statusCode >= 500) {
    // Server errors (500+)
    logger.error(logContext, `Server error: ${message}`);
  } else if (statusCode === 401 || statusCode === 403) {
    // Authentication/Authorization failures
    logger.warn(logContext, `Auth error: ${message}`);
  } else if (statusCode >= 400) {
    // Client errors (400-499)
    logger.info(logContext, `Client error: ${message}`);
  } else {
    // Other errors
    logger.info(logContext, `Error: ${message}`);
  }

  res.status(statusCode).json(errorResponse);
};

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};
