import Redis from 'ioredis';
import { env } from './env';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance (singleton pattern)
 * Returns null if Redis is not configured (graceful degradation)
 */
export const getRedisClient = (): Redis | null => {
  // If Redis URL is not configured, return null (graceful degradation)
  if (!env.REDIS_URL) {
    return null;
  }

  // Return existing client if already created
  if (redisClient) {
    return redisClient;
  }

  // Create new Redis client
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      // Graceful degradation on connection errors
      lazyConnect: true,
    });

    // Log connection events
    redisClient.on('connect', () => {
      console.log('Redis connected');
    });

    redisClient.on('error', (error) => {
      console.error('Redis connection error:', error.message);
    });

    redisClient.on('close', () => {
      console.log('Redis connection closed');
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
};

/**
 * Connect to Redis
 * Safe to call multiple times - will only connect once
 */
export const connectRedis = async (): Promise<void> => {
  const client = getRedisClient();

  if (!client) {
    console.warn('Redis URL not configured - running without cache');
    return;
  }

  try {
    await client.connect();
    console.log('Redis connection established');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    console.warn('Continuing without Redis cache');
  }
};

/**
 * Disconnect from Redis
 * Should be called during graceful shutdown
 */
export const disconnectRedis = async (): Promise<void> => {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis disconnected');
  } catch (error) {
    console.error('Error disconnecting from Redis:', error);
  }
};
