import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../constants/config';

// Callback for handling unauthorized errors (401)
// This will be set by AuthContext to trigger logout
let unauthorizedCallback: (() => void) | null = null;

// Create axios instance
const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Set the callback function to be called when a 401 error occurs
 * This should be called by AuthContext to handle automatic logout
 */
export const setUnauthorizedCallback = (callback: () => void) => {
  unauthorizedCallback = callback;
};

// Request interceptor - attach JWT token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and token expiration
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      await AsyncStorage.removeItem('authToken');

      // Call the unauthorized callback if set (triggers logout in AuthContext)
      if (unauthorizedCallback) {
        unauthorizedCallback();
      }
    }

    // Log errors for debugging
    if (__DEV__) {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
