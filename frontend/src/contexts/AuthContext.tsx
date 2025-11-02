import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth.api';
import { saveToken, getToken, removeToken } from '../utils/tokenStorage';
import { setUnauthorizedCallback } from '../api/client';
import type { User, AuthContextType } from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      // Call logout API (optional, for server-side cleanup)
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local state and storage
      await removeToken();
      setUser(null);
      setToken(null);
    }
  }, []);

  // Set up 401 handler and restore session on mount
  useEffect(() => {
    // Set up the unauthorized callback for API client
    setUnauthorizedCallback(() => {
      // Clear state when 401 occurs
      setUser(null);
      setToken(null);
    });

    const restoreSession = async () => {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          setToken(storedToken);
          // Note: In a production app, you might want to validate the token
          // or fetch user data from an endpoint like /auth/me
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      const { user: userData, token: authToken } = response.data;

      // Save token to storage
      await saveToken(authToken);

      // Update state
      setUser(userData);
      setToken(authToken);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      const response = await authApi.register(email, password, name);
      const { user: userData, token: authToken } = response.data;

      // Save token to storage
      await saveToken(authToken);

      // Update state
      setUser(userData);
      setToken(authToken);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
