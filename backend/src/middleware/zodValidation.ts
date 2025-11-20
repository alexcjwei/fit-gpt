import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler';

/**
 * Middleware factory to validate request body using Zod schemas
 * This ensures all Zod transforms (like XSS sanitization) are applied
 *
 * @param schema - The Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody(schema: ZodSchema) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Parse and transform the request body using the Zod schema
      // This will apply all .transform() functions including sanitization
      const validatedData = await schema.parseAsync(req.body);

      // Replace the request body with the validated and transformed data
      req.body = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Extract validation error messages
        const messages = error.errors.map((err) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });

        next(new AppError(`Validation failed: ${messages.join(', ')}`, 400));
      } else {
        next(error);
      }
    }
  };
}
