import Anthropic from '@anthropic-ai/sdk';
import { Exercise, ExerciseInstance, SetInstance } from './domain';

// ============================================
// Exercise Search Service Types
// ============================================

export interface ExerciseSearchResult {
  exercise: Exercise;
  score: number; // Relevance score (0 for full-text search compatibility)
}

export interface ExerciseSearchOptions {
  limit?: number; // Default: 5
  threshold?: number; // Ignored (kept for API compatibility)
}

// ============================================
// LLM Service Types
// ============================================

export type ModelType = 'sonnet' | 'haiku';

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: Anthropic.Tool[];
  jsonMode?: boolean; // Force pure JSON output without markdown wrappers
}

export interface LLMResponse<T = unknown> {
  content: T;
  raw: Anthropic.Message;
}

// ============================================
// Workout Parser Service Types
// ============================================

export interface WorkoutParserOptions {
  date?: string;
  weightUnit?: 'lbs' | 'kg';
  userId?: string;
}

// ============================================
// Workout Service Types
// ============================================

// Type for creating a new exercise instance (without generated IDs)
export type ExerciseInstanceInput = Omit<ExerciseInstance, 'id' | 'sets'> & {
  sets: Array<Omit<SetInstance, 'id'>>;
};
