import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware to prevent abuse and protect against attacks
 * Implements tiered rate limits for different endpoint categories
 *
 * Security vulnerability addressed: VULN-002 (CWE-307)
 * - Prevents brute force attacks on authentication endpoints
 * - Prevents DoS attacks via expensive LLM operations
 * - Prevents general API abuse
 *
 * Note: These are factory functions (not singletons) to ensure each app instance
 * gets its own rate limiter with independent state. This is critical for testing
 * where multiple app instances are created.
 */

/**
 * Create strict rate limiter for authentication endpoints
 * Protects against brute force and credential stuffing attacks
 *
 * Limits: 5 requests per 15 minutes per IP
 */
export function createAuthLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many authentication attempts, please try again later',
      });
    },
  });
}

/**
 * Create rate limiter for expensive LLM-powered operations
 * Protects against API cost abuse and resource exhaustion
 *
 * Limits: 10 requests per 1 minute per IP
 */
export function createLlmLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 workout parses per minute
    message: 'Rate limit exceeded for AI operations, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded for AI operations, please try again later',
      });
    },
  });
}

/**
 * Create general API rate limiter for all endpoints
 * Prevents general abuse and ensures fair usage
 *
 * Limits: 300 requests per 15 minutes per IP
 * This allows ~20 requests per minute for normal user behavior
 */
export function createApiLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per window
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
      });
    },
  });
}
