/**
 * Token Counter Service
 *
 * Optional service for tracking token usage across LLM calls.
 * Used primarily for evaluation and performance monitoring.
 *
 * Design:
 * - Non-invasive: Pass null in production, instance for tracking
 * - Comprehensive: Tracks all LLM calls automatically
 * - Simple: Just increment() and getUsage()
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface TokenCounterService {
  increment(inputTokens: number, outputTokens: number): void;
  getUsage(): TokenUsage;
  reset(): void;
}

/**
 * Create a token counter instance
 */
export function createTokenCounter(): TokenCounterService {
  let inputTokens = 0;
  let outputTokens = 0;

  return {
    increment(input: number, output: number): void {
      inputTokens += input;
      outputTokens += output;
    },

    getUsage(): TokenUsage {
      return {
        inputTokens,
        outputTokens,
      };
    },

    reset(): void {
      inputTokens = 0;
      outputTokens = 0;
    },
  };
}
