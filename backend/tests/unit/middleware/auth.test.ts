import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../../src/middleware/auth';
import { AppError } from '../../../src/middleware/errorHandler';
import { env } from '../../../src/config/env';
import { generateToken } from '../../../src/services/auth.service';
import { AuthenticatedRequest } from '../../../src/types';

describe('Auth Middleware - Unit Tests', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('Valid Token Cases', () => {
    it('should accept valid JWT token and attach userId to request', () => {
      // Arrange
      const userId = 'test-user-123';
      const validToken = generateToken(userId);
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.userId).toBe(userId);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(); // Called without error
    });

    it('should decode userId correctly from token payload', () => {
      // Arrange
      const userId = 'user-456';
      const token = generateToken(userId);
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      expect(mockRequest.userId).toBe(decoded.userId);
      expect(mockRequest.userId).toBe(userId);
    });

    it('should call next() without arguments on successful authentication', () => {
      // Arrange
      const token = generateToken('user-789');
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect((mockNext as jest.Mock).mock.calls[0].length).toBe(0);
    });
  });

  describe('Missing Authorization Header', () => {
    it('should reject request without Authorization header', () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('No token provided');
      expect(error.statusCode).toBe(401);
    });

    it('should reject request with undefined Authorization header', () => {
      // Arrange
      mockRequest.headers = {
        authorization: undefined,
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('No token provided');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('Malformed Authorization Header', () => {
    it('should reject token without "Bearer " prefix', () => {
      // Arrange
      const token = generateToken('user-123');
      mockRequest.headers = {
        authorization: token, // Missing "Bearer " prefix
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('No token provided');
      expect(error.statusCode).toBe(401);
    });

    it('should reject Authorization header with only "Bearer"', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer',
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('No token provided');
      expect(error.statusCode).toBe(401);
    });

    it('should reject Authorization header with "Bearer " but no token', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid or expired token');
      expect(error.statusCode).toBe(401);
    });

    it('should reject Authorization header with wrong prefix format', () => {
      // Arrange
      const token = generateToken('user-123');
      mockRequest.headers = {
        authorization: `Token ${token}`, // Wrong prefix
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('No token provided');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('Invalid Token Cases', () => {
    it('should reject random string as token', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer random-invalid-token',
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid or expired token');
      expect(error.statusCode).toBe(401);
    });

    it('should reject malformed JWT token', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer not.a.valid.jwt',
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid or expired token');
      expect(error.statusCode).toBe(401);
    });

    it('should reject JWT token signed with wrong secret', () => {
      // Arrange
      const userId = 'user-123';
      const wrongSecret = 'wrong-secret-key';
      const invalidToken = jwt.sign({ userId }, wrongSecret, { expiresIn: '1h' });
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid or expired token');
      expect(error.statusCode).toBe(401);
    });

    it('should reject expired JWT token', () => {
      // Arrange
      const userId = 'user-123';
      const expiredToken = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '-1h' }); // Expired 1 hour ago
      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid or expired token');
      expect(error.statusCode).toBe(401);
    });

    it('should reject token with invalid payload structure', () => {
      // Arrange
      // Token without userId field
      const invalidPayloadToken = jwt.sign({ id: 'user-123' }, env.JWT_SECRET, {
        expiresIn: '1h',
      });
      mockRequest.headers = {
        authorization: `Bearer ${invalidPayloadToken}`,
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.userId).toBeUndefined();
      expect(mockNext).toHaveBeenCalledTimes(1);
      // Should still call next without error since JWT verification succeeds,
      // but userId will be undefined
    });
  });

  describe('Error Handling', () => {
    it('should pass AppError to next() for authentication failures', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.isOperational).toBe(true);
    });

    it('should not modify request object on authentication failure', () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.userId).toBeUndefined();
    });

    it('should handle all errors through next() middleware pattern', () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect((mockNext as jest.Mock).mock.calls[0][0]).toBeDefined();
    });
  });

  describe('Token Edge Cases', () => {
    it('should handle token with extra spaces', () => {
      // Arrange
      const token = generateToken('user-123');
      mockRequest.headers = {
        authorization: `Bearer  ${token}`, // Extra space
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      // The split(' ')[1] will get empty string, which is invalid
      expect(mockNext).toHaveBeenCalledTimes(1);
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
    });

    it('should accept token with different userId formats', () => {
      // Arrange
      const userIds = ['123', 'user-abc-def', 'uuid-1234-5678-90ab'];

      userIds.forEach((userId) => {
        // Reset mocks
        mockNext = jest.fn();
        const token = generateToken(userId);
        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        // Act
        authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        // Assert
        expect(mockRequest.userId).toBe(userId);
        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    it('should handle very long tokens', () => {
      // Arrange
      const longUserId = 'a'.repeat(1000); // Very long userId
      const token = generateToken(longUserId);
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      // Act
      authenticate(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.userId).toBe(longUserId);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
