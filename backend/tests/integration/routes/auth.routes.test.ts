import request from 'supertest';
import { createApp } from '../../../src/createApp';
import { TestContainer } from '../../utils/testContainer';

/**
 * Integration tests for auth routes
 * These tests use an isolated PostgreSQL container for complete test isolation
 */
describe('Auth Routes Integration Tests', () => {
  const testContainer = new TestContainer();
  let app: ReturnType<typeof createApp>;

  // Setup: Start isolated container and connect to test database before all tests
  beforeAll(async () => {
    const db = await testContainer.start();
    app = createApp(db);
  });

  // Cleanup: Clear database after each test to ensure isolation
  afterEach(async () => {
    await testContainer.clearDatabase();
  });

  // Teardown: Stop container and close database connection after all tests
  afterAll(async () => {
    await testContainer.stop();
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
      const db = testContainer.getDb();
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

      const db = testContainer.getDb();
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

      const db = testContainer.getDb();
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

  describe('Account Lockout', () => {
    const userData = {
      email: 'lockout@example.com',
      password: 'password123',
      name: 'Lockout Test User',
    };

    beforeEach(async () => {
      // Create a user before each test
      await request(app).post('/api/auth/register').send(userData);
    });

    it('should lock account after 5 failed login attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: userData.email,
            password: 'wrongpassword',
          })
          .expect(401);
      }

      // 6th attempt should return 403 with lockout message
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        })
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: expect.stringMatching(/Account locked/i),
      });
      expect(response.body.error).toMatch(/\d+\s+minute/i);
    });

    it('should increment failed login attempts on wrong password', async () => {
      // Make 2 failed attempts
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      // Verify failed attempts were recorded in database
      const db = testContainer.getDb();
      const userInDb = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', userData.email)
        .executeTakeFirst();

      expect(userInDb?.failed_login_attempts).toBe(2);
      expect(userInDb?.locked_until).toBeNull();
    });

    it('should reset failed login attempts on successful login', async () => {
      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: userData.email,
            password: 'wrongpassword',
          })
          .expect(401);
      }

      // Verify failed attempts were recorded
      const db = testContainer.getDb();
      let userInDb = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', userData.email)
        .executeTakeFirst();
      expect(userInDb?.failed_login_attempts).toBe(3);

      // Successful login should reset counter
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      // Verify failed attempts were reset
      userInDb = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', userData.email)
        .executeTakeFirst();
      expect(userInDb?.failed_login_attempts).toBe(0);
    });

    it('should prevent login when account is locked', async () => {
      // Lock the account by making 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: userData.email,
            password: 'wrongpassword',
          })
          .expect(401);
      }

      // Try to login with correct password while locked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: expect.stringMatching(/Account locked/i),
      });
    });

    it('should include minutes remaining in lockout error message', async () => {
      // Lock the account by making 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: userData.email,
            password: 'wrongpassword',
          })
          .expect(401);
      }

      // Try to login again to get lockout message
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(403);

      // Should mention minutes (should be 30 or close to it)
      expect(response.body.error).toMatch(/\d+\s+minute/i);
      const minutesMatch = response.body.error.match(/(\d+)\s+minute/i);
      const minutes = parseInt(minutesMatch[1]);
      expect(minutes).toBeGreaterThan(0);
      expect(minutes).toBeLessThanOrEqual(30);
    });

    it('should allow login after lockout period expires', async () => {
      // Lock the account
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: userData.email,
            password: 'wrongpassword',
          })
          .expect(401);
      }

      // Verify account is locked
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(403);

      // Manually expire the lockout by setting locked_until to past
      const db = testContainer.getDb();
      await db
        .updateTable('users')
        .set({
          locked_until: new Date(Date.now() - 1000), // 1 second ago
        })
        .where('email', '=', userData.email)
        .execute();

      // Should be able to login now
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should not increment failed attempts for non-existent email', async () => {
      // Try to login with non-existent email
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword',
        })
        .expect(401);

      // Should not create a user or affect any counters
      const db = testContainer.getDb();
      const userInDb = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', 'nonexistent@example.com')
        .executeTakeFirst();

      expect(userInDb).toBeUndefined();
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
