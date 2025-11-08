import {
  validateSetInput,
  formatSetValue,
  parseSetValue,
} from '../EditableSetsList.utils';
import type { SetInstance } from '../../types/workout.types';

describe('EditableSetsList', () => {
  describe('validateSetInput', () => {
    it('should accept valid integer for reps', () => {
      expect(validateSetInput('reps', '10')).toBe(true);
      expect(validateSetInput('reps', '1')).toBe(true);
      expect(validateSetInput('reps', '100')).toBe(true);
    });

    it('should reject negative numbers for reps', () => {
      expect(validateSetInput('reps', '-5')).toBe(false);
    });

    it('should reject decimal numbers for reps', () => {
      expect(validateSetInput('reps', '10.5')).toBe(false);
    });

    it('should accept empty string for reps', () => {
      expect(validateSetInput('reps', '')).toBe(true);
    });

    it('should accept valid numbers for weight', () => {
      expect(validateSetInput('weight', '135')).toBe(true);
      expect(validateSetInput('weight', '135.5')).toBe(true);
      expect(validateSetInput('weight', '0')).toBe(true);
    });

    it('should reject negative numbers for weight', () => {
      expect(validateSetInput('weight', '-10')).toBe(false);
    });

    it('should accept empty string for weight', () => {
      expect(validateSetInput('weight', '')).toBe(true);
    });

    it('should accept valid integers for duration', () => {
      expect(validateSetInput('duration', '30')).toBe(true);
      expect(validateSetInput('duration', '90')).toBe(true);
    });

    it('should reject negative numbers for duration', () => {
      expect(validateSetInput('duration', '-30')).toBe(false);
    });

    it('should reject decimal numbers for duration', () => {
      expect(validateSetInput('duration', '30.5')).toBe(false);
    });

    it('should accept empty string for duration', () => {
      expect(validateSetInput('duration', '')).toBe(true);
    });
  });

  describe('formatSetValue', () => {
    it('should format undefined as empty string', () => {
      expect(formatSetValue(undefined)).toBe('');
    });

    it('should format number as string', () => {
      expect(formatSetValue(10)).toBe('10');
      expect(formatSetValue(135.5)).toBe('135.5');
      expect(formatSetValue(0)).toBe('0');
    });
  });

  describe('parseSetValue', () => {
    it('should parse empty string as undefined', () => {
      expect(parseSetValue('')).toBeUndefined();
    });

    it('should parse valid number string', () => {
      expect(parseSetValue('10')).toBe(10);
      expect(parseSetValue('135.5')).toBe(135.5);
      expect(parseSetValue('0')).toBe(0);
    });

    it('should handle whitespace', () => {
      expect(parseSetValue('  10  ')).toBe(10);
      expect(parseSetValue(' ')).toBeUndefined();
    });

    it('should return undefined for invalid numbers', () => {
      expect(parseSetValue('abc')).toBeUndefined();
      expect(parseSetValue('10abc')).toBeUndefined();
    });
  });

  describe('Set data transformations', () => {
    const mockSet: SetInstance = {
      id: 'set-1',
      setNumber: 1,
      reps: 10,
      weight: 135,
      weightUnit: 'lbs',
      duration: undefined,
      rpe: 8,
      notes: undefined,
    };

    it('should correctly format set with all fields', () => {
      expect(formatSetValue(mockSet.reps)).toBe('10');
      expect(formatSetValue(mockSet.weight)).toBe('135');
      expect(formatSetValue(mockSet.duration)).toBe('');
    });

    it('should correctly format set with missing fields', () => {
      const partialSet: SetInstance = {
        id: 'set-2',
        setNumber: 2,
        weightUnit: 'kg',
      };

      expect(formatSetValue(partialSet.reps)).toBe('');
      expect(formatSetValue(partialSet.weight)).toBe('');
      expect(formatSetValue(partialSet.duration)).toBe('');
    });

    it('should parse and validate a complete update cycle', () => {
      // Simulate user entering values
      const userReps = '12';
      const userWeight = '140.5';
      const userDuration = '30';

      // Validate inputs
      expect(validateSetInput('reps', userReps)).toBe(true);
      expect(validateSetInput('weight', userWeight)).toBe(true);
      expect(validateSetInput('duration', userDuration)).toBe(true);

      // Parse values
      expect(parseSetValue(userReps)).toBe(12);
      expect(parseSetValue(userWeight)).toBe(140.5);
      expect(parseSetValue(userDuration)).toBe(30);
    });
  });
});
