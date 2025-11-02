// Environment configuration
// In Expo/React Native, you can access environment variables using process.env
// Make sure to restart the bundler after changing environment variables

const config = {
  // API Configuration
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',

  // App Configuration
  appName: 'Gen Workout',
  appVersion: '1.0.0',

  // Feature Flags (can be extended)
  features: {
    enableOfflineMode: true,
    enablePushNotifications: false,
  },
} as const;

export default config;
