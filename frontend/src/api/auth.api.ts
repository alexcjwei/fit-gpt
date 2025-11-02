import apiClient from './client';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth.types';

/**
 * Login user with email and password
 */
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', {
    email,
    password,
  } as LoginRequest);
  return response.data;
};

/**
 * Register a new user
 */
export const register = async (
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/register', {
    email,
    password,
    name,
  } as RegisterRequest);
  return response.data;
};

/**
 * Logout user (client-side token removal)
 */
export const logout = async (): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
  return response.data;
};
