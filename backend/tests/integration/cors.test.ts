import request from 'supertest';
import { TestContainer } from '../utils/testContainer';
import { createApp } from '../../src/createApp';

/**
 * Integration tests for CORS security configuration
 * Tests the CORS vulnerability fix (VULN-008)
 */
describe('CORS Security', () => {
  const testContainer = new TestContainer();
  const originalEnv = process.env.NODE_ENV;
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  beforeAll(async () => {
    await testContainer.start();
  });

  afterEach(async () => {
    await testContainer.clearDatabase();
    // Restore original env
    process.env.NODE_ENV = originalEnv;
    process.env.CORS_ORIGIN = originalCorsOrigin;
  });

  afterAll(async () => {
    await testContainer.stop();
  });

  describe('Production Environment - Wildcard Protection', () => {
    it('should throw error on app creation if CORS_ORIGIN contains wildcard in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGIN = '*';
      const db = testContainer.getDb();

      expect(() => createApp(db)).toThrow('CORS wildcard (*) not allowed in production');
    });

    it('should throw error if wildcard is in comma-separated list in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGIN = 'https://example.com,*,https://other.com';
      const db = testContainer.getDb();

      expect(() => createApp(db)).toThrow('CORS wildcard (*) not allowed in production');
    });

    it('should allow wildcard in development environment', async () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ORIGIN = '*';
      const db = testContainer.getDb();

      const app = createApp(db);

      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://evil-site.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://evil-site.com');
    });

    it('should allow wildcard in test environment', async () => {
      process.env.NODE_ENV = 'test';
      process.env.CORS_ORIGIN = '*';
      const db = testContainer.getDb();

      const app = createApp(db);

      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://random-site.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://random-site.com');
    });
  });

  describe('Origin Validation - Whitelisted Origins Only', () => {
    it('should allow whitelisted origin', async () => {
      process.env.CORS_ORIGIN = 'https://example.com';
      const db = testContainer.getDb();
      const app = createApp(db);

      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
    });

    it('should allow multiple whitelisted origins (comma-separated)', async () => {
      process.env.CORS_ORIGIN = 'https://example.com,https://other.com,http://localhost:3000';
      const db = testContainer.getDb();
      const app = createApp(db);

      // Test first origin
      const response1 = await request(app)
        .get('/health')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response1.headers['access-control-allow-origin']).toBe('https://example.com');

      // Test second origin
      const response2 = await request(app)
        .get('/health')
        .set('Origin', 'https://other.com')
        .expect(200);

      expect(response2.headers['access-control-allow-origin']).toBe('https://other.com');

      // Test third origin
      const response3 = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response3.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should reject non-whitelisted origin', async () => {
      process.env.CORS_ORIGIN = 'https://example.com';
      const db = testContainer.getDb();
      const app = createApp(db);

      await request(app)
        .get('/health')
        .set('Origin', 'https://evil-site.com')
        .expect(500); // CORS error is handled by error middleware
    });
  });

  describe('No-Origin Requests - Expo Mobile App Only', () => {
    it('should allow requests with no origin from Expo user-agent', async () => {
      process.env.CORS_ORIGIN = 'https://example.com';
      const db = testContainer.getDb();
      const app = createApp(db);

      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'Mozilla/5.0 (Linux; Android 12) Expo/51.0.0')
        // No Origin header
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should reject requests with no origin from non-Expo user-agent', async () => {
      process.env.CORS_ORIGIN = 'https://example.com';
      const db = testContainer.getDb();
      const app = createApp(db);

      await request(app)
        .get('/health')
        .set('User-Agent', 'PostmanRuntime/7.32.3')
        // No Origin header
        .expect(500); // Should be rejected by CORS
    });

    it('should reject requests with no origin and no user-agent', async () => {
      process.env.CORS_ORIGIN = 'https://example.com';
      const db = testContainer.getDb();
      const app = createApp(db);

      await request(app)
        .get('/health')
        // No Origin, no User-Agent
        .expect(500); // Should be rejected by CORS
    });
  });

  describe('Expo exp:// Origins', () => {
    it('should allow exp:// origins from Expo user-agent', async () => {
      process.env.CORS_ORIGIN = 'https://example.com';
      const db = testContainer.getDb();
      const app = createApp(db);

      const response = await request(app)
        .get('/health')
        .set('Origin', 'exp://192.168.1.100:8081')
        .set('User-Agent', 'Mozilla/5.0 (Linux; Android 12) Expo/51.0.0')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('exp://192.168.1.100:8081');
    });

    it('should reject exp:// origins from non-Expo user-agent', async () => {
      process.env.CORS_ORIGIN = 'https://example.com';
      const db = testContainer.getDb();
      const app = createApp(db);

      await request(app)
        .get('/health')
        .set('Origin', 'exp://192.168.1.100:8081')
        .set('User-Agent', 'curl/7.68.0')
        .expect(500); // Should be rejected
    });
  });

  describe('Credentials Support', () => {
    it('should include credentials header for allowed origins', async () => {
      process.env.CORS_ORIGIN = 'https://example.com';
      const db = testContainer.getDb();
      const app = createApp(db);

      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});
