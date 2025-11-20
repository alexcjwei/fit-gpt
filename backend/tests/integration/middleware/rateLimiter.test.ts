import request from 'supertest';
import { createApp } from '../../../src/createApp';
import { TestContainer } from '../../utils/testContainer';

/**
 * Integration tests for rate limiting middleware
 * Tests real rate limiting behavior with isolated PostgreSQL container
 *
 * NOTE: Each test gets a fresh app instance with fresh rate limiters to ensure
 * test isolation. This is different from other integration tests which share
 * an app instance.
 */
describe('Rate Limiter Integration Tests', () => {
  const testContainer = new TestContainer();
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    await testContainer.start();
  });

  beforeEach(async () => {
    // Create fresh app with fresh rate limiters for each test
    const db = testContainer.getDb();
    app = createApp(db); // Rate limiting enabled by default
  });

  afterEach(async () => {
    await testContainer.clearDatabase();
  });

  afterAll(async () => {
    await testContainer.stop();
  });

  describe('Auth Rate Limiter (5 requests per 15 minutes)', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should allow up to 5 registration attempts', async () => {
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
      }
    });

    it('should block the 6th registration attempt with 429 status', async () => {
      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${i}@example.com`,
            password: 'password123',
            name: 'Test User',
          });
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test999@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Too many authentication attempts'),
      });
    });

    it('should apply rate limiting to login endpoint', async () => {
      // First register a user
      await request(app).post('/api/auth/register').send(validUserData);

      // Make 4 more login attempts (total 5 with registration)
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: validUserData.email,
            password: 'wrongpassword',
          });
      }

      // 6th auth request (across register + login) should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password,
        })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Too many authentication attempts'),
      });
    });

    it('should include standard rate limit headers', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      // Should have RateLimit-* headers (standardHeaders: true)
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });

  describe('LLM Rate Limiter (10 requests per 1 minute)', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and login to get auth token
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });
      authToken = response.body.data.token;
    });

    it('should include standard rate limit headers on LLM endpoint', async () => {
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
  });

  describe('General API Rate Limiter (300 requests per 15 minutes)', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and login to get auth token
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });
      authToken = response.body.data.token;
    });

    it('should allow many general API requests before rate limiting', async () => {
      // Make 50 requests to a non-auth, non-LLM endpoint
      // (using 50 instead of 300 to keep test duration reasonable)
      for (let i = 0; i < 50; i++) {
        const response = await request(app)
          .get('/api/workouts')
          .set('Authorization', `Bearer ${authToken}`);

        // Should not be rate limited
        expect(response.status).not.toBe(429);
      }
    });

    it('should apply general rate limit to all API endpoints', async () => {
      // Verify rate limiter is present by checking headers
      const response = await request(app)
        .get('/api/workouts')
        .set('Authorization', `Bearer ${authToken}`);

      // Should have RateLimit-* headers
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe('Rate Limiter Independence', () => {
    it('should track auth and general API limits independently', async () => {
      // Register a user (counts toward auth limit)
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });
      const authToken = registerResponse.body.data.token;

      // Make 4 more auth requests (total 5 - at the auth limit)
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          });
      }

      // Auth should be at limit, but general API should still work
      const apiResponse = await request(app)
        .get('/api/workouts')
        .set('Authorization', `Bearer ${authToken}`);

      // Should not be rate limited on general API endpoint
      expect(apiResponse.status).not.toBe(429);
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
