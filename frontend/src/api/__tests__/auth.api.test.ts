import { login, register, logout } from '../auth.api';
import type { AuthResponse } from '../../types/auth.types';

// Mock axios
jest.mock('axios');

// Mock the apiClient module
jest.mock('../client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import apiClient from '../client';
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('auth.api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse: AuthResponse = {
        success: true,
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
          },
          token: 'jwt-token-123',
        },
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await login('test@example.com', 'password123');

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockedApiClient.post.mock.calls).toHaveLength(1);
    });

    it('should throw error on login failure', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: 'Invalid credentials',
          },
        },
      };

      mockedApiClient.post.mockRejectedValueOnce(mockError);

      await expect(login('test@example.com', 'wrongpassword')).rejects.toEqual(mockError);
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockResponse: AuthResponse = {
        success: true,
        data: {
          user: {
            id: 'user-456',
            email: 'newuser@example.com',
            name: 'New User',
          },
          token: 'jwt-token-456',
        },
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await register('newuser@example.com', 'password123', 'New User');

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/register', {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      });
      expect(mockedApiClient.post.mock.calls).toHaveLength(1);
    });

    it('should throw error when email already exists', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: 'Email already registered',
          },
        },
      };

      mockedApiClient.post.mockRejectedValueOnce(mockError);

      await expect(
        register('existing@example.com', 'password123', 'Existing User')
      ).rejects.toEqual(mockError);
    });

    it('should throw error on validation failure', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: 'Validation failed',
          },
        },
      };

      mockedApiClient.post.mockRejectedValueOnce(mockError);

      await expect(register('invalid-email', 'short', 'A')).rejects.toEqual(mockError);
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      const mockResponse = {
        success: true,
        message: 'Logged out successfully',
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await logout();

      expect(result).toEqual(mockResponse);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(mockedApiClient.post.mock.calls).toHaveLength(1);
    });

    it('should handle logout errors gracefully', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: 'Logout failed',
          },
        },
      };

      mockedApiClient.post.mockRejectedValueOnce(mockError);

      await expect(logout()).rejects.toEqual(mockError);
    });
  });
});
