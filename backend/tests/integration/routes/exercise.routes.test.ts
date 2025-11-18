import request from 'supertest';
import { createApp } from '../../../src/app';
import * as testDb from '../../utils/testDb';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { ExerciseRepository } from '../../../src/repositories/ExerciseRepository';
import { generateToken } from '../../../src/services/auth.service';
import { Application } from 'express';

/**
 * Integration tests for exercise routes
 * These tests use PostgreSQL test database to test the full request/response cycle
 */
describe('Exercise Routes Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let userId: string;
  let userRepo: UserRepository;
  let exerciseRepo: ExerciseRepository;

  // Setup: Connect to test database and create app before all tests
  beforeAll(async () => {
    await testDb.connect();
    const db = testDb.getTestDb();
    app = createApp(db);
    userRepo = new UserRepository(db);
    exerciseRepo = new ExerciseRepository(db);
  });

  // Cleanup: Clear database after each test to ensure isolation
  afterEach(async () => {
    await testDb.clearDatabase();
  });

  // Teardown: Close database connection after all tests
  afterAll(async () => {
    await testDb.closeDatabase();
  });

  beforeEach(async () => {
    // Create a test user and generate auth token
    const user = await userRepo.create({
      email: 'test@example.com',
      password: 'hashedpassword123',
      name: 'Test User',
    });
    userId = user.id;
    authToken = generateToken(userId);
  });

  describe('GET /api/exercises/search', () => {
    describe('Special character normalization', () => {
      beforeEach(async () => {
        // Seed database with exercises that have special characters
        await exerciseRepo.create({
          slug: 'chin-up',
          name: 'Chin-up',
          tags: ['back', 'bodyweight'],
        });
        await exerciseRepo.create({
          slug: '90-90-hip-switch',
          name: '90/90 Hip Switch',
          tags: ['mobility', 'hips'],
        });
        await exerciseRepo.create({
          slug: 't-bar-row',
          name: 'T-Bar Row',
          tags: ['back', 'barbell'],
        });
        await exerciseRepo.create({
          slug: '3-4-sit-up',
          name: '3/4 Sit-Up',
          tags: ['core', 'bodyweight'],
        });
      });

      it('should find "Chin-up" when searching for "chin up" (hyphen to space)', async () => {
        const response = await request(app)
          .get('/api/exercises/search')
          .query({ q: 'chin up', limit: 5 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.results).toBeDefined();
        expect(response.body.data.results.length).toBeGreaterThan(0);

        // Check that Chin-up is in the results
        const chinUp = response.body.data.results.find(
          (r: any) => r.exercise.name === 'Chin-up'
        );
        expect(chinUp).toBeDefined();
      });

      it('should find "90/90 Hip Switch" when searching for "90 90 hip switch" (slash to space)', async () => {
        const response = await request(app)
          .get('/api/exercises/search')
          .query({ q: '90 90 hip switch', limit: 5 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.results).toBeDefined();
        expect(response.body.data.results.length).toBeGreaterThan(0);

        // Check that 90/90 Hip Switch is in the results
        const hipSwitch = response.body.data.results.find(
          (r: any) => r.exercise.name === '90/90 Hip Switch'
        );
        expect(hipSwitch).toBeDefined();
      });

      it('should find "T-Bar Row" when searching for "t bar row" (hyphen to space)', async () => {
        const response = await request(app)
          .get('/api/exercises/search')
          .query({ q: 't bar row', limit: 5 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.results).toBeDefined();
        expect(response.body.data.results.length).toBeGreaterThan(0);

        // Check that T-Bar Row is in the results
        const tBarRow = response.body.data.results.find(
          (r: any) => r.exercise.name === 'T-Bar Row'
        );
        expect(tBarRow).toBeDefined();
      });

      it('should find "3/4 Sit-Up" when searching for "3 4 sit up" (slash to space)', async () => {
        const response = await request(app)
          .get('/api/exercises/search')
          .query({ q: '3 4 sit up', limit: 5 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.results).toBeDefined();
        expect(response.body.data.results.length).toBeGreaterThan(0);

        // Check that 3/4 Sit-Up is in the results
        const sitUp = response.body.data.results.find(
          (r: any) => r.exercise.name === '3/4 Sit-Up'
        );
        expect(sitUp).toBeDefined();
      });

      it('should return original display names with special characters intact', async () => {
        const response = await request(app)
          .get('/api/exercises/search')
          .query({ q: 'chin up', limit: 5 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const chinUp = response.body.data.results.find(
          (r: any) => r.exercise.name === 'Chin-up'
        );

        // Verify the name still has the hyphen
        expect(chinUp.exercise.name).toBe('Chin-up');
        expect(chinUp.exercise.name).not.toBe('Chin up');
      });

      it('should only return relevant results for partial word searches', async () => {
        // Seed exercises to test partial matching
        await exerciseRepo.create({
          slug: 'ab-crunch-machine',
          name: 'Ab Crunch Machine',
          tags: ['core', 'machine'],
        });
        await exerciseRepo.create({
          slug: 'calf-machine-shoulder-shrug',
          name: 'Calf Machine Shoulder Shrug',
          tags: ['calves', 'machine'],
        });

        // Search for "chin" - should not return unrelated exercises
        const response = await request(app)
          .get('/api/exercises/search')
          .query({ q: 'chin', limit: 5 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.results).toBeDefined();

        // Check that results contain "chin" in their name (or are very similar)
        const results = response.body.data.results;
        for (const result of results) {
          const normalizedName = result.exercise.name.toLowerCase().replace(/[-/]/g, ' ');
          // Either contains "chin" or has very high similarity
          // Should NOT return "Ab Crunch Machine" or "Calf Machine Shoulder Shrug"
          expect(normalizedName).not.toBe('ab crunch machine');
          expect(normalizedName).not.toBe('calf machine shoulder shrug');
        }

        // The chin-up exercise should be in results if it exists
        const chinUp = results.find((r: any) => r.exercise.name === 'Chin-up');
        expect(chinUp).toBeDefined();
      });
    });

    describe('Validation', () => {
      it('should return 400 when query is missing', async () => {
        const response = await request(app)
          .get('/api/exercises/search')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should return 400 when query is too short', async () => {
        const response = await request(app)
          .get('/api/exercises/search')
          .query({ q: 'a' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should return 401 when not authenticated', async () => {
        await request(app)
          .get('/api/exercises/search')
          .query({ q: 'bench press' })
          .expect(401);
      });
    });

    describe('Basic search functionality', () => {
      beforeEach(async () => {
        await exerciseRepo.create({
          slug: 'barbell-bench-press',
          name: 'Barbell Bench Press',
          tags: ['chest', 'push', 'barbell', 'compound'],
        });
        await exerciseRepo.create({
          slug: 'dumbbell-bench-press',
          name: 'Dumbbell Bench Press',
          tags: ['chest', 'push', 'dumbbell', 'compound'],
        });
        await exerciseRepo.create({
          slug: 'back-squat',
          name: 'Back Squat',
          tags: ['legs', 'squat', 'barbell', 'compound'],
        });
      });

      it('should search exercises by name', async () => {
        const response = await request(app)
          .get('/api/exercises/search')
          .query({ q: 'bench press', limit: 5 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.results).toBeDefined();
        expect(response.body.data.results.length).toBeGreaterThan(0);

        // Should find exercises with "bench press" in the name
        const names = response.body.data.results.map((r: any) => r.exercise.name);
        expect(names.some((name: string) => name.toLowerCase().includes('bench press'))).toBe(
          true
        );
      });

      it('should respect the limit parameter', async () => {
        const response = await request(app)
          .get('/api/exercises/search')
          .query({ q: 'bench', limit: 1 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.results.length).toBeLessThanOrEqual(1);
      });

      it('should use default limit of 5 when not specified', async () => {
        const response = await request(app)
          .get('/api/exercises/search')
          .query({ q: 'bench' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.results.length).toBeLessThanOrEqual(5);
      });

      it('should return empty array when no matches found', async () => {
        const response = await request(app)
          .get('/api/exercises/search')
          .query({ q: 'nonexistentexercisename12345' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.results).toEqual([]);
      });
    });
  });
});
