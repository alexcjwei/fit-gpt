import { AppError } from '../middleware/errorHandler';

/**
 * Sanitizes user-supplied workout text to prevent LLM prompt injection attacks
 *
 * Security measures:
 * 1. Length validation (max 10,000 characters)
 * 2. Empty/whitespace-only rejection
 * 3. Suspicious pattern detection (prompt override attempts)
 * 4. Delimiter injection prevention
 *
 * @param text - User-supplied workout text
 * @returns Sanitized text if valid
 * @throws AppError if text contains prohibited content or exceeds limits
 */
export function sanitizeWorkoutText(text: string): string {
  // 1. Check for empty or whitespace-only strings
  if (!text || text.trim().length === 0) {
    throw new AppError('Workout text cannot be empty', 400);
  }

  // 2. Check length limit (prevent cost amplification attacks)
  if (text.length > 10000) {
    throw new AppError('Workout text too long (max 10000 characters)', 400);
  }

  // 3. Detect suspicious patterns that indicate prompt injection attempts
  // These patterns are designed to catch common LLM jailbreak techniques
  // while allowing legitimate workout terminology

  const suspiciousPatterns = [
    // Direct instruction override attempts
    /ignore\s+(all\s+)?previous\s+(instructions|directives|commands)/gi,
    /disregard\s+(all\s+)?(previous|prior)\s+(instructions|directives)/gi,
    /new\s+instructions?:/gi,

    // System/role override attempts
    /system\s+prompt/gi,
    /admin\s+mode/gi,
    /(you\s+are|your\s+role\s+is)\s+now\s+(a|an)\s+\w+\s+(admin|assistant|helper)/gi,

    // Job/task redefinition (more specific to avoid false positives)
    /your\s+job\s+is\s+now\s+to\s+(?!focus|maintain|ensure|complete)/gi,

    // Delimiter injection attempts
    /<\/(text|workout_text|original_text|parsed_workout|instructions|output|example)>/gi,

    // Multiple closing tags in sequence (strong indicator of injection)
    /<\/\w+>\s*<\/\w+>/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      throw new AppError('Workout text contains prohibited content', 400);
    }
  }

  // Text passes all validation checks
  return text;
}
