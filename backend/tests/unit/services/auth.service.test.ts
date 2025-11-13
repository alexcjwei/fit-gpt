import {
  registerUser,
  loginUser,
  hashPassword,
  comparePassword,
  generateToken,
} from '../../../src/services/auth.service';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { AppError } from '../../../src/middleware/errorHandler';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Auth Service - Unit Tests', () => {
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // Create a mock UserRepository with all methods
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByIdWithPassword: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByEmail: jest.fn(),
    } as any;
  });

  describe('hashPassword', () => {
    it('should hash a plain text password', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);

      expect(hashed).toBeTruthy();
      expect(hashed).not.toBe(password);
      expect(hashed).toMatch(/^\$2[ab]\$/); // Bcrypt format
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Salt makes each hash unique
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);

      const isMatch = await comparePassword(password, hashed);
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hashed = await hashPassword(password);

      const isMatch = await comparePassword(wrongPassword, hashed);
      expect(isMatch).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = '12345';
      const token = generateToken(userId);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should include userId in token payload', () => {
      const userId = '12345';
      const token = generateToken(userId);

      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      expect(decoded.userId).toBe(userId);
    });

    it('should generate different tokens for different user IDs', () => {
      const token1 = generateToken('user1');
      const token2 = generateToken('user2');

      expect(token1).not.toBe(token2);
    });
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const name = 'Test User';

      const mockUser = {
        id: '1',
        email: email.toLowerCase(),
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock repository methods
      mockUserRepository.existsByEmail = jest.fn().mockResolvedValue(false);
      mockUserRepository.create = jest.fn().mockResolvedValue(mockUser);

      const result = await registerUser(email, password, name, mockUserRepository);

      // Verify repository was called correctly
      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(email);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email,
        password: expect.any(String), // Hashed password
        name,
      });

      // Verify result structure
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        },
        token: expect.any(String),
      });

      // Verify token is valid
      const decoded = jwt.verify(result.token, env.JWT_SECRET) as { userId: string };
      expect(decoded.userId).toBe(mockUser.id);
    });

    it('should throw error if user already exists', async () => {
      const email = 'existing@example.com';
      const password = 'password123';
      const name = 'Test User';

      mockUserRepository.existsByEmail = jest.fn().mockResolvedValue(true);

      await expect(registerUser(email, password, name, mockUserRepository)).rejects.toThrow(
        new AppError('User with this email already exists', 400)
      );

      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      const email = 'test@example.com';
      const password = 'plainPassword123';
      const name = 'Test User';

      const mockUser = {
        id: '1',
        email,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.existsByEmail = jest.fn().mockResolvedValue(false);
      mockUserRepository.create = jest.fn().mockResolvedValue(mockUser);

      await registerUser(email, password, name, mockUserRepository);

      // Check that password was hashed
      const createCall = mockUserRepository.create.mock.calls[0][0];
      expect(createCall.password).not.toBe(password);
      expect(createCall.password).toMatch(/^\$2[ab]\$/);
    });
  });

  describe('loginUser', () => {
    it('should successfully login with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await hashPassword(password);

      const mockUserWithPassword = {
        id: '1',
        email,
        name: 'Test User',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findByEmailWithPassword = jest.fn().mockResolvedValue(mockUserWithPassword);

      const result = await loginUser(email, password, mockUserRepository);

      expect(mockUserRepository.findByEmailWithPassword).toHaveBeenCalledWith(email);

      expect(result).toEqual({
        user: {
          id: mockUserWithPassword.id,
          email: mockUserWithPassword.email,
          name: mockUserWithPassword.name,
        },
        token: expect.any(String),
      });

      // Verify token is valid
      const decoded = jwt.verify(result.token, env.JWT_SECRET) as { userId: string };
      expect(decoded.userId).toBe(mockUserWithPassword.id);
    });

    it('should throw error if user not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      mockUserRepository.findByEmailWithPassword = jest.fn().mockResolvedValue(null);

      await expect(loginUser(email, password, mockUserRepository)).rejects.toThrow(
        new AppError('Invalid credentials', 401)
      );

      expect(mockUserRepository.findByEmailWithPassword).toHaveBeenCalledWith(email);
    });

    it('should throw error if password is incorrect', async () => {
      const email = 'test@example.com';
      const correctPassword = 'password123';
      const wrongPassword = 'wrongPassword';
      const hashedPassword = await hashPassword(correctPassword);

      const mockUserWithPassword = {
        id: '1',
        email,
        name: 'Test User',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findByEmailWithPassword = jest.fn().mockResolvedValue(mockUserWithPassword);

      await expect(loginUser(email, wrongPassword, mockUserRepository)).rejects.toThrow(
        new AppError('Invalid credentials', 401)
      );

      expect(mockUserRepository.findByEmailWithPassword).toHaveBeenCalledWith(email);
    });
  });
});
