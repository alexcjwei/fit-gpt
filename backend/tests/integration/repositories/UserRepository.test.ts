import { Kysely } from 'kysely';
import { Database } from '../../../src/db/types';
import { createUserRepository } from '../../../src/repositories/UserRepository';
import { connect, closeDatabase, clearDatabase, getTestDb } from '../../utils/testDb';

describe('UserRepository', () => {
  let db: Kysely<Database>;
  let userRepository: ReturnType<typeof createUserRepository>;

  beforeAll(async () => {
    await connect();
    db = getTestDb();
    userRepository = createUserRepository(db);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      };

      const user = await userRepository.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      // Password should not be included in User type
      expect((user as any).password).toBeUndefined();
    });

    it('should normalize email to lowercase and trim', async () => {
      const userData = {
        email: '  TEST@EXAMPLE.COM  ',
        password: 'hashedpassword123',
        name: 'Test User',
      };

      const user = await userRepository.create(userData);

      expect(user.email).toBe('test@example.com');
    });

    it('should trim name', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: '  Test User  ',
      };

      const user = await userRepository.create(userData);

      expect(user.name).toBe('Test User');
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      };

      await userRepository.create(userData);

      // Attempt to create user with same email
      await expect(userRepository.create(userData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const created = await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const found = await userRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('test@example.com');
      expect(found?.name).toBe('Test User');
      // Password should not be included
      expect((found as any)?.password).toBeUndefined();
    });

    it('should return null for non-existent ID', async () => {
      const found = await userRepository.findById('999999');

      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const found = await userRepository.findByEmail('test@example.com');

      expect(found).toBeDefined();
      expect(found?.email).toBe('test@example.com');
      expect(found?.name).toBe('Test User');
      // Password should not be included
      expect((found as any)?.password).toBeUndefined();
    });

    it('should be case-insensitive', async () => {
      await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const found = await userRepository.findByEmail('TEST@EXAMPLE.COM');

      expect(found).toBeDefined();
      expect(found?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      const found = await userRepository.findByEmail('nonexistent@example.com');

      expect(found).toBeNull();
    });
  });

  describe('findByIdWithPassword', () => {
    it('should find user by ID including password', async () => {
      const created = await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const found = await userRepository.findByIdWithPassword(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('test@example.com');
      expect(found?.password).toBe('hashedpassword123');
    });

    it('should return null for non-existent ID', async () => {
      const found = await userRepository.findByIdWithPassword('999999');

      expect(found).toBeNull();
    });
  });

  describe('findByEmailWithPassword', () => {
    it('should find user by email including password', async () => {
      await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const found = await userRepository.findByEmailWithPassword('test@example.com');

      expect(found).toBeDefined();
      expect(found?.email).toBe('test@example.com');
      expect(found?.password).toBe('hashedpassword123');
    });

    it('should return null for non-existent email', async () => {
      const found = await userRepository.findByEmailWithPassword('nonexistent@example.com');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user email', async () => {
      const created = await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const updated = await userRepository.update(created.id, {
        email: 'newemail@example.com',
      });

      expect(updated).toBeDefined();
      expect(updated?.email).toBe('newemail@example.com');
      expect(updated?.name).toBe('Test User'); // Unchanged
    });

    it('should update user name', async () => {
      const created = await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const updated = await userRepository.update(created.id, {
        name: 'Updated Name',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.email).toBe('test@example.com'); // Unchanged
    });

    it('should update user password', async () => {
      const created = await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const updated = await userRepository.update(created.id, {
        password: 'newhashedpassword456',
      });

      expect(updated).toBeDefined();

      // Verify password was updated by fetching with password
      const withPassword = await userRepository.findByIdWithPassword(created.id);
      expect(withPassword?.password).toBe('newhashedpassword456');
    });

    it('should update multiple fields at once', async () => {
      const created = await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const updated = await userRepository.update(created.id, {
        email: 'newemail@example.com',
        name: 'New Name',
      });

      expect(updated).toBeDefined();
      expect(updated?.email).toBe('newemail@example.com');
      expect(updated?.name).toBe('New Name');
    });

    it('should update updated_at timestamp', async () => {
      const created = await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await userRepository.update(created.id, {
        name: 'Updated Name',
      });

      expect(updated).toBeDefined();
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should return null for non-existent ID', async () => {
      const updated = await userRepository.update('999999', {
        name: 'Updated Name',
      });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete user by ID', async () => {
      const created = await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const deleted = await userRepository.delete(created.id);

      expect(deleted).toBe(true);

      // Verify user is deleted
      const found = await userRepository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const deleted = await userRepository.delete('999999');

      expect(deleted).toBe(false);
    });
  });

  describe('existsByEmail', () => {
    it('should return true if user exists', async () => {
      await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const exists = await userRepository.existsByEmail('test@example.com');

      expect(exists).toBe(true);
    });

    it('should be case-insensitive', async () => {
      await userRepository.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        name: 'Test User',
      });

      const exists = await userRepository.existsByEmail('TEST@EXAMPLE.COM');

      expect(exists).toBe(true);
    });

    it('should return false if user does not exist', async () => {
      const exists = await userRepository.existsByEmail('nonexistent@example.com');

      expect(exists).toBe(false);
    });
  });
});
