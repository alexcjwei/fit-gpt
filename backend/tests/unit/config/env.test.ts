// @ts-nocheck
import { buildMongoUri } from '../../../src/config/env';

describe('Environment Configuration - MongoDB URI', () => {
  describe('buildMongoUri', () => {
    it('should prioritize MONGO_URL when provided (Railway format)', () => {
      const result = buildMongoUri({
        MONGO_URL: 'mongodb://user:pass@railway.host:27017/mydb',
        MONGODB_URI: 'mongodb://localhost:27017/fallback',
        MONGOHOST: 'other.host',
        MONGOPORT: '27018',
        MONGOUSER: 'otheruser',
        MONGOPASSWORD: 'otherpass',
      });

      expect(result).toBe('mongodb://user:pass@railway.host:27017/mydb');
    });

    it('should construct URI from Railway individual variables when MONGO_URL is not provided', () => {
      const result = buildMongoUri({
        MONGOHOST: 'railway.host',
        MONGOPORT: '27017',
        MONGOUSER: 'railwayuser',
        MONGOPASSWORD: 'railwaypass',
      });

      expect(result).toBe('mongodb://railwayuser:railwaypass@railway.host:27017/fit-gpt');
    });

    it('should fall back to MONGODB_URI when Railway variables are not provided (backwards compatibility)', () => {
      const result = buildMongoUri({
        MONGODB_URI: 'mongodb://localhost:27017/fit-gpt',
      });

      expect(result).toBe('mongodb://localhost:27017/fit-gpt');
    });

    it('should use default MONGODB_URI when no MongoDB config is provided', () => {
      const result = buildMongoUri({});

      expect(result).toBe('mongodb://localhost:27017/fit-gpt');
    });

    it('should not construct URI from Railway variables if any required field is missing', () => {
      // Missing MONGOPASSWORD
      const result = buildMongoUri({
        MONGOHOST: 'railway.host',
        MONGOPORT: '27017',
        MONGOUSER: 'railwayuser',
        MONGODB_URI: 'mongodb://localhost:27017/fallback',
      });

      // Should fall back to MONGODB_URI
      expect(result).toBe('mongodb://localhost:27017/fallback');
    });

    it('should handle Railway variables with special characters in password', () => {
      const result = buildMongoUri({
        MONGOHOST: 'railway.host',
        MONGOPORT: '27017',
        MONGOUSER: 'railwayuser',
        MONGOPASSWORD: 'p@ss:w/rd!',
      });

      // Password should be URL-encoded
      expect(result).toContain(encodeURIComponent('p@ss:w/rd!'));
    });
  });
});
