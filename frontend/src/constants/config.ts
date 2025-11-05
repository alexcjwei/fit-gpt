// Environment configuration
// Using expo-constants for environment variables
import Constants from 'expo-constants';

const ENV = {
  dev: {
    apiBaseUrl: 'http://localhost:3000/api',
  },
  prod: {
    apiBaseUrl: Constants.expoConfig?.extra?.apiBaseUrl || 'https://your-railway-url.railway.app/api',
  },
};

const getEnvVars = () => {
  // __DEV__ is set by React Native
  // @ts-ignore - __DEV__ is a React Native global
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return ENV.dev;
  }
  return ENV.prod;
};

const selectedEnv = getEnvVars();

const config = {
  // API Configuration
  apiBaseUrl: selectedEnv.apiBaseUrl,

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
