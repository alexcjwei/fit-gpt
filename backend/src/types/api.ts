// ============================================
// Generic API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

// ============================================
// Workout API Types
// ============================================

export interface WorkoutFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedWorkoutResponse {
  workouts: any[]; // Using any temporarily to avoid circular dependency
  pagination: PaginationMetadata;
}

// ============================================
// Exercise API Types
// ============================================

export interface ExerciseFilters {
  tag?: string;
  search?: string;
}

export interface PaginatedExerciseResponse {
  exercises: any[]; // Using any temporarily to avoid circular dependency
  pagination: PaginationMetadata;
}

// ============================================
// Auth API Types
// ============================================

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}
