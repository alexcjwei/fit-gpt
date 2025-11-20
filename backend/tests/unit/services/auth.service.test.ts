import {
  hashPassword,
  comparePassword,
  generateToken,
} from '../../../src/services/auth.service';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

describe('Auth Service - Pure Function Unit Tests', () => {
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
});
