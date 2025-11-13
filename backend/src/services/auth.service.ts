import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { UserRepository } from '../repositories/UserRepository';
import { db } from '../db';

const SALT_ROUNDS = 10;

// Singleton repository instance
let userRepository: UserRepository | null = null;

const getUserRepository = (): UserRepository => {
  if (!userRepository) {
    userRepository = new UserRepository(db);
  }
  return userRepository;
};

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
 * Register a new user
 */
export const registerUser = async (
  email: string,
  password: string,
  name: string,
  repository: UserRepository = getUserRepository()
): Promise<AuthResponse> => {

  // Check if user already exists
  const existingUser = await repository.existsByEmail(email);
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await repository.create({
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
};

/**
 * Login a user
 */
export const loginUser = async (
  email: string,
  password: string,
  repository: UserRepository = getUserRepository()
): Promise<AuthResponse> => {

  // Find user by email (with password field)
  const user = await repository.findByEmailWithPassword(email);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

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
};
