import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  ANTHROPIC_API_KEY: string;
}

interface PostgresEnvVars {
  DATABASE_URL?: string;
  POSTGRES_HOST?: string;
  POSTGRES_PORT?: string;
  POSTGRES_USER?: string;
  POSTGRES_PASSWORD?: string;
  POSTGRES_DB?: string;
}

/**
 * Builds PostgreSQL connection URI from environment variables.
 * Priority order:
 * 1. DATABASE_URL (Railway's pre-constructed connection string)
 * 2. Constructed from POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
 * 3. Default localhost URI
 */
export function buildPostgresUri(envVars: PostgresEnvVars): string {
  // Priority 1: Use Railway's DATABASE_URL if provided
  if (envVars.DATABASE_URL !== undefined && envVars.DATABASE_URL !== null && envVars.DATABASE_URL !== '') {
    return envVars.DATABASE_URL;
  }

  // Priority 2: Construct from individual variables
  const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = envVars;
  const host = POSTGRES_HOST || 'localhost';
  const port = POSTGRES_PORT || '5432';
  const user = POSTGRES_USER || 'postgres';
  const password = POSTGRES_PASSWORD || 'postgres';
  const database = POSTGRES_DB || 'fit_gpt_dev';

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env: EnvConfig = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: parseInt(getEnvVar('PORT', '3000'), 10),
  DATABASE_URL: buildPostgresUri(process.env as PostgresEnvVars),
  JWT_SECRET: getEnvVar('JWT_SECRET', 'dev-secret-change-in-production'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
  ANTHROPIC_API_KEY: getEnvVar('ANTHROPIC_API_KEY'),
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
