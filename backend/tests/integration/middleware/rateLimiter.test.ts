import request from 'supertest';
import { createApp } from '../../../src/createApp';
import { TestContainer } from '../../utils/testContainer';
import { createAuthLimiter, createLlmLimiter, createApiLimiter } from '../../../src/middleware/rateLimiter';
import type { RateLimitRequestHandler } from 'express-rate-limit';

/**
 * Integration tests for rate limiting middleware
 * Tests real rate limiting behavior with isolated PostgreSQL container
 */
describe('Rate Limiter Integration Tests', () => {
  const testContainer = new TestContainer();
  let app: ReturnType<typeof createApp>;
  let authLimiter: RateLimitRequestHandler;
  let llmLimiter: RateLimitRequestHandler;
  let apiLimiter: RateLimitRequestHandler;

  beforeAll(async () => {
    const db = await testContainer.start();

    // Create rate limiters that we can clean up later
    authLimiter = createAuthLimiter();
    llmLimiter = createLlmLimiter();
    apiLimiter = createApiLimiter();

    // Inject them into app
    app = createApp(db, null, { authLimiter, llmLimiter, apiLimiter });
  });

  afterEach(async () => {
    await testContainer.clearDatabase();
  });

  afterAll(async () => {
    // Clean up rate limiter intervals to prevent open handles
    // The MemoryStore used by express-rate-limit has an internal cleanup interval
    // We need to clear it to prevent Jest from hanging
    const stores = [authLimiter, llmLimiter, apiLimiter].map((limiter) => (limiter as any).store);

    stores.forEach((store) => {
      if (store && store.interval) {
        clearInterval(store.interval);
        store.interval = undefined;
      }
    });

    await testContainer.stop();
  });

  describe('Auth Rate Limiter (5 requests per 15 minutes)', () => {
    it('should enforce rate limits and include proper headers', async () => {
      // Make 5 requests - all should succeed or return validation errors, but not rate limit errors
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${i}@example.com`,
            password: 'password123',
            name: 'Test User',
          });

        // Should not be rate limited
        expect(response.status).not.toBe(429);

        // Should have rate limit headers
        expect(response.headers).toHaveProperty('ratelimit-limit');
        expect(response.headers).toHaveProperty('ratelimit-remaining');
        expect(response.headers).toHaveProperty('ratelimit-reset');

        // Verify it's the auth rate limiter (5 per 15 minutes)
        expect(response.headers['ratelimit-limit']).toBe('5');
      }

      // 6th request should be rate limited
      const blockedResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test999@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect(429);

      expect(blockedResponse.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Too many authentication attempts'),
      });
    });
  });

  describe('LLM and General API Rate Limiters', () => {
    it('should include proper rate limit headers on LLM endpoint', async () => {
      // Create user directly in DB to bypass auth rate limiter
      const db = testContainer.getDb();
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await db
        .insertInto('users')
        .values({
          email: 'llmtest@example.com',
          password: hashedPassword,
          name: 'LLM Test User',
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Generate token directly
      const { generateToken } = await import('../../../src/services/auth.service');
      const authToken = generateToken(user.id.toString());

      const workoutText = `
        ## Lower Body
        - Back Squat: 3x8
      `;

      const response = await request(app)
        .post('/api/workouts/parse')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: workoutText });

      // Should have RateLimit-* headers indicating LLM rate limiter is active
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');

      // Verify it's the LLM rate limiter (10 per minute)
      expect(response.headers['ratelimit-limit']).toBe('10');
    });

    it('should include rate limit headers on general API endpoints', async () => {
      // Create user directly in DB to bypass auth rate limiter
      const db = testContainer.getDb();
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await db
        .insertInto('users')
        .values({
          email: 'apitest@example.com',
          password: hashedPassword,
          name: 'API Test User',
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Generate token directly
      const { generateToken } = await import('../../../src/services/auth.service');
      const authToken = generateToken(user.id.toString());

      const response = await request(app)
        .get('/api/workouts')
        .set('Authorization', `Bearer ${authToken}`);

      // Should have RateLimit-* headers (general API limiter = 300 per 15 min)
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers['ratelimit-limit']).toBe('300');
    });
  });

  describe('Health Check Endpoint', () => {
    it('should not apply rate limiting to health check', async () => {
      // Make many requests to health check - should never be rate limited
      for (let i = 0; i < 20; i++) {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
      }
    });
  });
});
