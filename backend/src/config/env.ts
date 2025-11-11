import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  ANTHROPIC_API_KEY: string;
}

interface MongoEnvVars {
  MONGO_URL?: string;
  MONGODB_URI?: string;
  MONGOHOST?: string;
  MONGOPORT?: string;
  MONGOUSER?: string;
  MONGOPASSWORD?: string;
}

/**
 * Builds MongoDB connection URI from environment variables.
 * Priority order:
 * 1. MONGO_URL (Railway's pre-constructed connection string)
 * 2. Constructed from MONGOHOST, MONGOPORT, MONGOUSER, MONGOPASSWORD (Railway individual variables)
 * 3. MONGODB_URI (backwards compatibility)
 * 4. Default localhost URI
 */
export function buildMongoUri(envVars: MongoEnvVars): string {
  // Priority 1: Use Railway's MONGO_URL if provided
  if (envVars.MONGO_URL) {
    return envVars.MONGO_URL;
  }

  // Priority 2: Construct from Railway individual variables if all are present
  const { MONGOHOST, MONGOPORT, MONGOUSER, MONGOPASSWORD } = envVars;
  if (MONGOHOST && MONGOPORT && MONGOUSER && MONGOPASSWORD) {
    const encodedPassword = encodeURIComponent(MONGOPASSWORD);
    return `mongodb://${MONGOUSER}:${encodedPassword}@${MONGOHOST}:${MONGOPORT}/fit-gpt`;
  }

  // Priority 3: Fall back to MONGODB_URI for backwards compatibility
  if (envVars.MONGODB_URI) {
    return envVars.MONGODB_URI;
  }

  // Priority 4: Default to localhost
  return 'mongodb://localhost:27017/fit-gpt';
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env: EnvConfig = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: parseInt(getEnvVar('PORT', '3000'), 10),
  MONGODB_URI: buildMongoUri(process.env as MongoEnvVars),
  JWT_SECRET: getEnvVar('JWT_SECRET', 'dev-secret-change-in-production'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
  ANTHROPIC_API_KEY: getEnvVar('ANTHROPIC_API_KEY'),
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
