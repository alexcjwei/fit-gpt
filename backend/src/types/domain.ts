import { Request } from 'express';

// ============================================
// Auth Types
// ============================================

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

// ============================================
// Core Workout Types
// ============================================

export interface Workout {
  id: string; // PostgreSQL bigint as string
  name: string;
  date: string; // ISO 8601 date (YYYY-MM-DD)
  lastModifiedTime: string; // ISO 8601 timestamp
  notes?: string;
  blocks: WorkoutBlock[];
}

export interface WorkoutBlock {
  id: string; // UUID v4
  label?: string; // e.g., "Warm Up", "Superset A", "Cool Down"
  exercises: ExerciseInstance[];
  notes?: string;
}

export interface ExerciseInstance {
  id: string; // UUID v4
  exerciseId: string; // Reference to exercise definition
  orderInBlock: number; // Position within the block (0-indexed)
  sets: SetInstance[];
  prescription?: string; // e.g., "3 x 8", "3 x 8-10 x 135 lbs", "3 x 30 sec (Rest 90 sec)"
  notes?: string;
}

export interface SetInstance {
  id: string; // UUID v4
  setNumber: number; // 1-indexed
  reps?: number | null; // null means field is explicitly cleared
  weight?: number | null; // null means field is explicitly cleared
  weightUnit: 'lbs' | 'kg';
  duration?: number | null; // null means field is explicitly cleared (Duration in seconds for time-based exercises)
  rpe?: number | null; // Rate of perceived exertion (1-10)
  notes?: string | null;
}

/**
 * Helper function to determine if a set is completed
 * A set is considered completed if it has reps, weight, or duration filled in
 * Note: null means explicitly cleared, so it's not considered completed
 */
export const isSetCompleted = (set: SetInstance): boolean => {
  return (
    (set.reps !== undefined && set.reps !== null) ||
    (set.weight !== undefined && set.weight !== null) ||
    (set.duration !== undefined && set.duration !== null)
  );
};

// ============================================
// Frontend Presentation Types
// ============================================

/**
 * ExerciseInstance with resolved exercise name for frontend presentation
 * Separates NoSQL data models from frontend API responses
 */
export interface ExerciseInstanceResponse extends ExerciseInstance {
  exerciseName: string; // Resolved from exerciseId
}

export interface WorkoutBlockResponse extends Omit<WorkoutBlock, 'exercises'> {
  exercises: ExerciseInstanceResponse[];
}

export interface WorkoutResponse extends Omit<Workout, 'blocks'> {
  blocks: WorkoutBlockResponse[];
}

// ============================================
// Exercise Types
// ============================================

export interface Exercise {
  id: string; // PostgreSQL bigint as string
  slug: string; // Human-readable identifier (e.g., 'barbell-bench-press')
  name: string;
  tags?: string[]; // Flexible categorization (e.g., 'chest', 'push', 'barbell', 'beginner', 'compound')
  needsReview?: boolean; // True for exercises auto-created by LLM during workout parsing
}

// ============================================
// User Types
// ============================================

export interface User {
  id: string; // Database ID as string
  email: string;
  name: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  password: string; // Only included in auth-specific methods
}

// ============================================
// Audit Logging Types
// ============================================

/**
 * Security and audit event action types
 * These events are logged for compliance, security monitoring, and forensics
 */
export enum AuditLogAction {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  USER_REGISTERED = 'USER_REGISTERED',
  LOGOUT = 'LOGOUT',

  // Authorization events
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS',

  // Data modification events
  WORKOUT_CREATED = 'WORKOUT_CREATED',
  WORKOUT_UPDATED = 'WORKOUT_UPDATED',
  WORKOUT_DELETED = 'WORKOUT_DELETED',
  WORKOUT_DUPLICATED = 'WORKOUT_DUPLICATED',
  WORKOUT_BLOCK_ADDED = 'WORKOUT_BLOCK_ADDED',
  WORKOUT_BLOCK_REMOVED = 'WORKOUT_BLOCK_REMOVED',
  EXERCISE_ADDED = 'EXERCISE_ADDED',
  EXERCISE_REMOVED = 'EXERCISE_REMOVED',
  SET_COMPLETED = 'SET_COMPLETED',

  // Account changes
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  EMAIL_CHANGED = 'EMAIL_CHANGED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',

  // Security events
  RATE_LIMIT_HIT = 'RATE_LIMIT_HIT',
  PROMPT_INJECTION_DETECTED = 'PROMPT_INJECTION_DETECTED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',

  // System events
  SERVER_ERROR = 'SERVER_ERROR',
}

/**
 * Log severity levels
 */
export type AuditLogSeverity = 'info' | 'warn' | 'error';

/**
 * Audit log entry (as stored in database)
 */
export interface AuditLog {
  id: string; // PostgreSQL bigint as string
  userId: string | null; // Null for unauthenticated events (e.g., failed login)
  action: AuditLogAction;
  resourceType: string | null; // e.g., 'workout', 'user', 'exercise'
  resourceId: string | null; // ID of the affected resource
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, any> | null; // JSONB field for flexible data
  severity: AuditLogSeverity;
  createdAt: Date;
}

/**
 * Data required to create an audit log entry
 */
export interface CreateAuditLogData {
  userId?: string | null;
  action: AuditLogAction;
  resourceType?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  severity: AuditLogSeverity;
}
