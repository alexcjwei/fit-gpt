import { normalizeForCache, normalizeForSlug } from '../../../src/utils/stringNormalization';

describe('String Normalization Utils', () => {
  describe('normalizeForCache', () => {
    it('should normalize exercise name to lowercase with underscores', () => {
      const result = normalizeForCache('Barbell Bench Press');
      expect(result).toBe('barbell_bench_press');
    });

    it('should replace hyphens with underscores', () => {
      const result = normalizeForCache('Chin-Up');
      expect(result).toBe('chin_up');
    });

    it('should replace slashes with underscores', () => {
      const result = normalizeForCache('90/90 Hip Switch');
      expect(result).toBe('90_90_hip_switch');
    });

    it('should replace apostrophes with underscores', () => {
      const result = normalizeForCache("Farmer's Walk");
      expect(result).toBe('farmer_s_walk');
    });

    it('should collapse multiple spaces/underscores into single underscore', () => {
      const result = normalizeForCache('Wide   Grip   Pull Up');
      expect(result).toBe('wide_grip_pull_up');
    });

    it('should trim leading and trailing whitespace', () => {
      const result = normalizeForCache('  Barbell Squat  ');
      expect(result).toBe('barbell_squat');
    });

    it('should handle mixed special characters', () => {
      const result = normalizeForCache("T-Bar Row / Farmer's Walk");
      expect(result).toBe('t_bar_row_farmer_s_walk');
    });

    it('should handle empty string', () => {
      const result = normalizeForCache('');
      expect(result).toBe('');
    });

    it('should handle string with only special characters', () => {
      const result = normalizeForCache('---///   ');
      expect(result).toBe('_');
    });
  });

  describe('normalizeForSlug', () => {
    it('should create URL-friendly slug from exercise name', () => {
      const result = normalizeForSlug('Barbell Bench Press');
      expect(result).toBe('barbell-bench-press');
    });

    it('should preserve hyphens in slug', () => {
      const result = normalizeForSlug('Chin-Up');
      expect(result).toBe('chin-up');
    });

    it('should remove slashes from slug', () => {
      const result = normalizeForSlug('90/90 Hip Switch');
      expect(result).toBe('9090-hip-switch');
    });

    it('should remove apostrophes from slug', () => {
      const result = normalizeForSlug("Farmer's Walk");
      expect(result).toBe('farmers-walk');
    });

    it('should collapse multiple spaces into single hyphen', () => {
      const result = normalizeForSlug('Wide   Grip   Pull Up');
      expect(result).toBe('wide-grip-pull-up');
    });

    it('should remove special characters except hyphens', () => {
      const result = normalizeForSlug('T-Bar Row (Heavy)');
      expect(result).toBe('t-bar-row-heavy');
    });

    it('should handle empty string', () => {
      const result = normalizeForSlug('');
      expect(result).toBe('');
    });

    it('should preserve numbers in slug', () => {
      const result = normalizeForSlug('21s Bicep Curl');
      expect(result).toBe('21s-bicep-curl');
    });
  });
});
