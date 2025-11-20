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
    const app = createApp(db, null, true); // Skip rate limiting for createApp tests

    expect(app).toBeDefined();
  });

  it('should respond to health check endpoint', async () => {
    const db = testContainer.getDb();
    const app = createApp(db, null, true); // Skip rate limiting for createApp tests

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
    const app = createApp(db, null, true); // Skip rate limiting for createApp tests

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
});
