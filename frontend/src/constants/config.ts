// Environment configuration
// Using Expo's built-in environment variable support
// Variables are loaded from .env, .env.production, or .env.local files
// Use EXPO_PUBLIC_ prefix to make variables available at runtime

const config = {
  // API Configuration
  // Reads from EXPO_PUBLIC_API_BASE_URL in .env files
  // Defaults to localhost for development if not set
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',

  // App Configuration
  appName: 'FitGPT',
  appVersion: '1.0.0',

  // Feature Flags (can be extended)
  features: {
    enableOfflineMode: true,
    enablePushNotifications: false,
  },
} as const;

export default config;
