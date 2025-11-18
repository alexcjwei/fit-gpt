import request from 'supertest';
import * as testDb from '../utils/testDb';
import { createApp } from '../../src/createApp';

/**
 * Integration tests for createApp factory
 * Verifies that we can create an Express app with an injected database
 */
describe('createApp Factory', () => {
  beforeAll(async () => {
    await testDb.connect();
  });

  afterEach(async () => {
    await testDb.clearDatabase();
  });

  afterAll(async () => {
    await testDb.closeDatabase();
  });

  it('should create an Express app with injected database', async () => {
    const db = testDb.getTestDb();
    const app = createApp(db);

    expect(app).toBeDefined();
  });

  it('should respond to health check endpoint', async () => {
    const db = testDb.getTestDb();
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
    const db = testDb.getTestDb();
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
});
