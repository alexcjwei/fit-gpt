import { buildPostgresUri } from '../../../src/config/env';

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
