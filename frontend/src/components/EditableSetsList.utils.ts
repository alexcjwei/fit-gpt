/**
 * Business logic for EditableSetsList component
 * Separated for testability
 */

export type SetField = 'reps' | 'weight' | 'duration';

/**
 * Validates user input for a set field
 * @param field - The field being validated
 * @param value - The string value to validate
 * @returns true if the value is valid for the field
 */
export function validateSetInput(field: SetField, value: string): boolean {
  // Empty string is always valid (represents undefined/cleared value)
  if (value.trim() === '') {
    return true;
  }

  const num = Number(value);

  // Check if it's a valid number
  if (isNaN(num)) {
    return false;
  }

  // No negative numbers
  if (num < 0) {
    return false;
  }

  // Reps and duration must be integers
  if (field === 'reps' || field === 'duration') {
    return Number.isInteger(num);
  }

  // Weight can be decimal
  return true;
}

/**
 * Formats a set value for display in input field
 * @param value - The numeric value or undefined
 * @returns String representation for the input field
 */
export function formatSetValue(value: number | undefined): string {
  if (value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Parses a string input value to a number or undefined
 * @param value - The string value from the input
 * @returns Parsed number or undefined if empty/invalid
 */
export function parseSetValue(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }

  const num = Number(trimmed);
  if (isNaN(num)) {
    return undefined;
  }

  return num;
}
