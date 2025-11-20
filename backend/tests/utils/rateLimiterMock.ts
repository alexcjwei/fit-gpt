import type { RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

/**
 * No-op rate limiter for testing
 * This middleware does nothing - it simply calls next() to allow all requests through
 */
export const noopRateLimiter = ((_req: Request, _res: Response, next: NextFunction) => {
  next();
}) as unknown as RateLimitRequestHandler;
