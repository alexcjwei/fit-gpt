import request from 'supertest';
import { TestContainer } from '../utils/testContainer';
import { createApp } from '../../src/createApp';

/**
 * Integration tests for createApp factory
 * Verifies that we can create an Express app with an injected database
 */
describe('createApp Factory', () => {
  const testContainer = new TestContainer();

  beforeAll(async () => {
    await testContainer.start();
  });

  afterEach(async () => {
    await testContainer.clearDatabase();
  });

  afterAll(async () => {
    await testContainer.stop();
  });

  it('should create an Express app with injected database', async () => {
    const db = testContainer.getDb();
    const app = createApp(db);

    expect(app).toBeDefined();
  });

  it('should respond to health check endpoint', async () => {
    const db = testContainer.getDb();
    const app = createApp(db);

    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      environment: expect.any(String),
    });
  });

  it('should use the injected database for operations', async () => {
    const db = testContainer.getDb();
    const app = createApp(db);

    // Register a user (which should use the injected test database)
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      })
      .expect(201);

    expect(response.body.success).toBe(true);

    // Verify user was created in the test database (not production)
    const userInDb = await db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', 'test@example.com')
      .executeTakeFirst();

    expect(userInDb).toBeDefined();
    expect(userInDb?.name).toBe('Test User');
  });

  describe('Body Size Limits (VULN-007)', () => {
    it('should accept JSON payloads under 1MB', async () => {
      const db = testContainer.getDb();
      const app = createApp(db);

      // Create a payload just under 1MB (approximately 900KB)
      const smallPayload = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        // Add some padding data to make it substantial but under 1MB
        data: 'x'.repeat(900 * 1024),
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(smallPayload);

      // Should not get 413 (Payload Too Large)
      expect(response.status).not.toBe(413);
    });

    it('should reject JSON payloads over 1MB with 413', async () => {
      const db = testContainer.getDb();
      const app = createApp(db);

      // Create a payload over 1MB (approximately 2MB)
      const largePayload = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        data: 'x'.repeat(2 * 1024 * 1024),
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largePayload);

      // Should get 413 (Payload Too Large)
      expect(response.status).toBe(413);
    });

    it('should accept URL-encoded payloads under 1MB', async () => {
      const db = testContainer.getDb();
      const app = createApp(db);

      // Create a URL-encoded payload under 1MB
      const smallData = 'x'.repeat(900 * 1024);

      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(`email=test@example.com&password=password123&name=Test&data=${smallData}`);

      // Should not get 413 (Payload Too Large)
      expect(response.status).not.toBe(413);
    });

    it('should reject URL-encoded payloads over 1MB with 413', async () => {
      const db = testContainer.getDb();
      const app = createApp(db);

      // Create a URL-encoded payload over 1MB (approximately 2MB)
      const largeData = 'x'.repeat(2 * 1024 * 1024);

      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(`email=test@example.com&password=password123&name=Test&data=${largeData}`);

      // Should get 413 (Payload Too Large)
      expect(response.status).toBe(413);
    });
  });
});
