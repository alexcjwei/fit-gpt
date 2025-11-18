import request from 'supertest';
import { createApp } from '../../../src/createApp';
import * as testDb from '../../utils/testDb';

/**
 * Integration tests for auth routes
 * These tests use PostgreSQL test database to test the full request/response cycle
 * without mocking and without hitting the actual database cluster.
 */
describe('Auth Routes Integration Tests', () => {
  let app: ReturnType<typeof createApp>;

  // Setup: Connect to in-memory database before all tests
  beforeAll(async () => {
    await testDb.connect();
    app = createApp(testDb.getTestDb());
  });

  // Cleanup: Clear database after each test to ensure isolation
  afterEach(async () => {
    await testDb.clearDatabase();
  });

  // Teardown: Close database connection after all tests
  afterAll(async () => {
    await testDb.closeDatabase();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should successfully register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Verify response structure
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            email: validUserData.email,
            name: validUserData.name,
          },
          token: expect.any(String),
        },
      });

      // Verify user was created in database
      const db = testDb.getTestDb();
      const userInDb = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', validUserData.email)
        .executeTakeFirst();
      expect(userInDb).toBeTruthy();
      expect(userInDb?.name).toBe(validUserData.name);
      expect(userInDb?.email).toBe(validUserData.email);
    });

    it('should return a valid JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      const token = response.body.data.token;
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      // JWT format: header.payload.signature
      expect(token.split('.')).toHaveLength(3);
    });

    it('should hash the password in the database', async () => {
      await request(app).post('/api/auth/register').send(validUserData).expect(201);

      const db = testDb.getTestDb();
      const userInDb = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', validUserData.email)
        .executeTakeFirst();
      expect(userInDb?.password).toBeTruthy();
      expect(userInDb?.password).not.toBe(validUserData.password);
      // Bcrypt hashes start with $2b$ or $2a$
      expect(userInDb?.password).toMatch(/^\$2[ab]\$/);
    });

    it('should reject duplicate email registration', async () => {
      // Register first user
      await request(app).post('/api/auth/register').send(validUserData).expect(201);

      // Attempt to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'User with this email already exists',
      });
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject password shorter than 6 characters', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          password: '12345',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing name field', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: validUserData.email,
          password: validUserData.password,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing email field', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: validUserData.password,
          name: validUserData.name,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing password field', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: validUserData.email,
          name: validUserData.name,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'TEST@EXAMPLE.COM',
        })
        .expect(201);

      expect(response.body.data.user.email).toBe('test@example.com');

      const db = testDb.getTestDb();
      const userInDb = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', 'test@example.com')
        .executeTakeFirst();
      expect(userInDb).toBeTruthy();
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    beforeEach(async () => {
      // Create a user before each login test
      await request(app).post('/api/auth/register').send(userData);
    });

    it('should successfully login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            email: userData.email,
            name: userData.name,
          },
          token: expect.any(String),
        },
      });
    });

    it('should return a valid JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      const token = response.body.data.token;
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid credentials',
      });
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userData.password,
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid credentials',
      });
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: userData.password,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: userData.password,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept email in any case', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: userData.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });
  });

  describe('POST /api/auth/logout', () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    let authToken: string;

    beforeEach(async () => {
      // Register and login to get auth token
      const response = await request(app).post('/api/auth/register').send(userData);
      authToken = response.body.data.token;
    });

    it('should successfully logout when authenticated', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
    });

    it('should reject logout without authentication token', async () => {
      const response = await request(app).post('/api/auth/logout').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject logout with malformed Authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', authToken) // Missing "Bearer " prefix
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
