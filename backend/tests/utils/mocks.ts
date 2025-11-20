import { Request, Response, NextFunction } from 'express';
import { type EmbeddingService } from '../../src/services/embedding.service';
import { type ExerciseCacheService } from '../../src/services/exerciseCache.service';
import { type ExerciseRepository } from '../../src/repositories/ExerciseRepository';
import { type UserRepository } from '../../src/repositories/UserRepository';
import { type WorkoutRepository } from '../../src/repositories/WorkoutRepository';
import { type LLMService } from '../../src/services/llm.service';
import { Exercise as ExerciseType, User } from '../../src/types';
import { AuthenticatedRequest } from '../../src/types';

/**
 * Create a mock embedding service for unit tests
 * Returns a service that generates deterministic zero-filled embeddings
 * to avoid making real API calls during testing
 */
export function createMockEmbeddingService(): jest.Mocked<EmbeddingService> {
  const mockEmbedding = new Array(1536).fill(0);

  return {
    generateEmbedding: jest.fn().mockResolvedValue(mockEmbedding),
    generateEmbeddings: jest.fn().mockResolvedValue([mockEmbedding]),
    cosineSimilarity: jest.fn().mockReturnValue(1.0),
  } as jest.Mocked<EmbeddingService>;
}

/**
 * Create a mock exercise cache service for unit tests
 */
export function createMockExerciseCacheService(): jest.Mocked<ExerciseCacheService> {
  return {
    getNormalizedName: jest.fn((name: string) => name.toLowerCase().replace(/\s+/g, '_')),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    setMany: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    warmup: jest.fn().mockResolvedValue(undefined),
    getSearchResults: jest.fn().mockResolvedValue(null),
    setSearchResults: jest.fn().mockResolvedValue(undefined),
    invalidateSearchCache: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<ExerciseCacheService>;
}

/**
 * Get the string representation of the mock embedding
 * Useful for asserting on database calls
 */
export function getMockEmbeddingString(): string {
  const mockEmbedding = new Array(1536).fill(0);
  return `[${mockEmbedding.join(',')}]`;
}

/**
 * Create a mock Express Request for middleware testing
 */
export function createMockExpressRequest(overrides?: Partial<AuthenticatedRequest>): Partial<AuthenticatedRequest> {
  return {
    headers: {},
    ...overrides,
  };
}

/**
 * Create a mock Express Response for middleware testing
 */
export function createMockExpressResponse(): Partial<Response> {
  return {};
}

/**
 * Create a mock Express NextFunction for middleware testing
 */
export function createMockNextFunction(): NextFunction {
  return jest.fn();
}

/**
 * Create a mock ExerciseRepository for unit tests
 */
export function createMockExerciseRepository(): jest.Mocked<ExerciseRepository> {
  return {
    searchByName: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findAll: jest.fn(),
    filter: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    existsByName: jest.fn(),
    existsBySlug: jest.fn(),
    existsById: jest.fn(),
    findByTag: jest.fn(),
    checkDuplicateName: jest.fn(),
  } as any;
}

/**
 * Create a mock UserRepository for unit tests
 */
export function createMockUserRepository(): jest.Mocked<UserRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByIdWithPassword: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    existsByEmail: jest.fn(),
  } as any;
}

/**
 * Create a mock WorkoutRepository for unit tests
 */
export function createMockWorkoutRepository(): jest.Mocked<WorkoutRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as any;
}

/**
 * Create a mock LLMService for unit tests
 */
export function createMockLLMService(): jest.Mocked<LLMService> {
  return {
    call: jest.fn(),
  } as any;
}

/**
 * Create a mock Exercise for unit tests
 */
export function createMockExercise(overrides?: Partial<ExerciseType>): ExerciseType {
  return {
    id: '1',
    name: 'Mock Exercise',
    slug: 'mock-exercise',
    tags: ['test'],
    ...overrides,
  };
}

/**
 * Create a mock User for unit tests
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock user data for registration/login
 */
export function createMockUserData(overrides?: { email?: string; password?: string; name?: string }) {
  return {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    ...overrides,
  };
}
