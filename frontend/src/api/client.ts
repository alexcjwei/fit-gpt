import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../constants/config';

// Callback for handling unauthorized errors (401)
// This will be set by AuthContext to trigger logout
let unauthorizedCallback: (() => void) | null = null;

// Create axios instance
const apiClient = axios.create({
  baseURL: typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl : 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Set the callback function to be called when a 401 error occurs
 * This should be called by AuthContext to handle automatic logout
 */
export const setUnauthorizedCallback = (callback: () => void): void => {
  unauthorizedCallback = callback;
};

// Request interceptor - attach JWT token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token !== null && token !== '' && token !== undefined) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving auth token:', error);
    }
    return config;
  },
  (error: Error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and token expiration
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: unknown) => {
    const axiosError = error as { response?: { status?: number; data?: unknown }; config?: { url?: string; method?: string } };
    if (axiosError.response?.status === 401) {
      // Token expired or invalid - clear storage
      await AsyncStorage.removeItem('authToken');

      // Call the unauthorized callback if set (triggers logout in AuthContext)
      if (unauthorizedCallback !== null) {
        unauthorizedCallback();
      }
    }

    // Log errors for debugging
    if (__DEV__) {
      const url = axiosError.config?.url;
      const method = axiosError.config?.method;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;
      console.error('API Error:', {
        url,
        method,
        status,
        data,
      });
    }

    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

export default apiClient;
