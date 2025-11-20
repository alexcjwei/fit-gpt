import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import type { UserRepository } from '../repositories/UserRepository';

const SALT_ROUNDS = 10;

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

/**
 * Hash a plain text password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain text password with a hashed password
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate a JWT token for a user
 */
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
};

/**
 * Create Auth Service with injected dependencies
 * Factory function pattern for dependency injection
 */
export function createAuthService(userRepository: UserRepository) {
  return {
    /**
     * Register a new user
     */
    async registerUser(email: string, password: string, name: string): Promise<AuthResponse> {
      // Check if user already exists
      const existingUser = await userRepository.existsByEmail(email);
      if (existingUser) {
        throw new AppError('User with this email already exists', 400);
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await userRepository.create({
        email,
        password: hashedPassword,
        name,
      });

      // Generate token
      const token = generateToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      };
    },

    /**
     * Login a user
     */
    async loginUser(email: string, password: string): Promise<AuthResponse> {
      // Find user by email (with password field)
      const user = await userRepository.findByEmailWithPassword(email);
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        throw new AppError(`Account locked. Try again in ${minutesLeft} minutes`, 403);
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        // Increment failed attempts
        await userRepository.incrementFailedAttempts(user.id);

        // Lock after 5 failed attempts
        if (user.failedLoginAttempts >= 4) {
          await userRepository.lockAccount(user.id, 30); // 30 minutes
          throw new AppError('Account locked due to multiple failed attempts', 403);
        }

        throw new AppError('Invalid credentials', 401);
      }

      // Reset failed attempts on successful login
      await userRepository.resetFailedAttempts(user.id);

      // Generate token
      const token = generateToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      };
    },
  };
}

/**
 * Type definition for AuthService (inferred from factory return type)
 */
export type AuthService = ReturnType<typeof createAuthService>;
