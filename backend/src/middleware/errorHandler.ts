import { Request, Response, NextFunction } from 'express';
import { isDevelopment } from '../config/env';

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

  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode,
  });

  res.status(statusCode).json(errorResponse);
};

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};
