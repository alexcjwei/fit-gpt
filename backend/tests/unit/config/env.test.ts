import { buildPostgresUri } from '../../../src/config/env';

describe('Environment Configuration - JWT Secret', () => {
  describe('JWT_SECRET validation', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      // Save original environment
      originalEnv = { ...process.env };
      // Set required environment variables for env module to load
      process.env.ANTHROPIC_API_KEY = 'test-key';
      process.env.OPENAI_API_KEY = 'test-key';
    });

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv;
      // Clear the module cache to ensure fresh env loading
      jest.resetModules();
    });

    it('should throw error when JWT_SECRET is missing in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      // Re-import to get fresh env with new environment variables
      expect(() => {
        jest.isolateModules(() => {
          require('../../../src/config/env');
        });
      }).toThrow('Missing required environment variable: JWT_SECRET');
    });

    it('should allow default JWT_SECRET in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;

      let env: any;
      expect(() => {
        jest.isolateModules(() => {
          env = require('../../../src/config/env').env;
        });
      }).not.toThrow();

      jest.isolateModules(() => {
        env = require('../../../src/config/env').env;
        expect(env.JWT_SECRET).toBe('dev-secret-change-in-production');
      });
    });

    it('should allow default JWT_SECRET in test environment', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.JWT_SECRET;

      let env: any;
      expect(() => {
        jest.isolateModules(() => {
          env = require('../../../src/config/env').env;
        });
      }).not.toThrow();

      jest.isolateModules(() => {
        env = require('../../../src/config/env').env;
        expect(env.JWT_SECRET).toBe('dev-secret-change-in-production');
      });
    });

    it('should accept custom JWT_SECRET when provided in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'custom-super-secure-secret-key-for-production';

      let env: any;
      expect(() => {
        jest.isolateModules(() => {
          env = require('../../../src/config/env').env;
        });
      }).not.toThrow();

      jest.isolateModules(() => {
        env = require('../../../src/config/env').env;
        expect(env.JWT_SECRET).toBe('custom-super-secure-secret-key-for-production');
      });
    });

    it('should accept custom JWT_SECRET when provided in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'custom-dev-secret';

      jest.isolateModules(() => {
        const env = require('../../../src/config/env').env;
        expect(env.JWT_SECRET).toBe('custom-dev-secret');
      });
    });
  });
});

describe('Environment Configuration - PostgreSQL URI', () => {
  describe('buildPostgresUri', () => {
    it('should prioritize TEST_DATABASE_URL when NODE_ENV=test', () => {
      const result = buildPostgresUri({
        NODE_ENV: 'test',
        TEST_DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
        DATABASE_URL: 'postgresql://prod:prod@prod.host:5432/prod_db',
        POSTGRES_HOST: 'other.host',
      });

      expect(result).toBe('postgresql://test:test@localhost:5432/test_db');
    });

    it('should prioritize DATABASE_URL when provided (Railway format)', () => {
      const result = buildPostgresUri({
        DATABASE_URL: 'postgresql://user:pass@railway.host:5432/mydb',
        POSTGRES_HOST: 'other.host',
        POSTGRES_PORT: '5433',
        POSTGRES_USER: 'otheruser',
        POSTGRES_PASSWORD: 'otherpass',
      });

      expect(result).toBe('postgresql://user:pass@railway.host:5432/mydb');
    });

    it('should construct URI from individual PostgreSQL variables when DATABASE_URL is not provided', () => {
      const result = buildPostgresUri({
        POSTGRES_HOST: 'myhost',
        POSTGRES_PORT: '5433',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypass',
        POSTGRES_DB: 'mydb',
      });

      expect(result).toBe('postgresql://myuser:mypass@myhost:5433/mydb');
    });

    it('should use default values when no PostgreSQL config is provided', () => {
      const result = buildPostgresUri({});

      expect(result).toBe('postgresql://postgres:postgres@localhost:5432/fit_gpt_dev');
    });

    it('should use fit_gpt_test database when NODE_ENV=test and no explicit config', () => {
      const result = buildPostgresUri({
        NODE_ENV: 'test',
      });

      expect(result).toBe('postgresql://postgres:postgres@localhost:5432/fit_gpt_test');
    });

    it('should handle special characters in password by URL-encoding them', () => {
      const result = buildPostgresUri({
        POSTGRES_HOST: 'myhost',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'p@ss:w/rd!',
        POSTGRES_DB: 'mydb',
      });

      // Password should be URL-encoded
      expect(result).toContain(encodeURIComponent('p@ss:w/rd!'));
      expect(result).toBe('postgresql://myuser:p%40ss%3Aw%2Frd!@myhost:5432/mydb');
    });
  });
});
