// ============================================
// User Repository Types
// ============================================

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  name?: string;
}

// ============================================
// Exercise Repository Types
// ============================================

export interface CreateExerciseData {
  slug: string;
  name: string;
  tags?: string[];
  needsReview?: boolean;
}

export interface UpdateExerciseData {
  slug?: string;
  name?: string;
  tags?: string[];
  needsReview?: boolean;
}

export interface ExerciseFilters {
  tags?: string[]; // Filter by tags (OR logic - matches any tag)
  nameQuery?: string; // Search by name substring
  needsReview?: boolean; // Filter by needsReview flag
}

// ============================================
// Workout Repository Types
// ============================================

export interface CreateWorkoutData {
  userId: string;
  name: string;
  date: string;
  lastModifiedTime: string;
  notes?: string;
  blocks?: CreateWorkoutBlockData[];
}

export interface CreateWorkoutBlockData {
  label?: string;
  notes?: string;
  exercises?: CreateExerciseInstanceData[];
}

export interface CreateExerciseInstanceData {
  exerciseId: string;
  orderInBlock: number;
  prescription?: string;
  notes?: string;
  sets?: CreateSetInstanceData[];
}

export interface CreateSetInstanceData {
  setNumber: number;
  reps?: number | null;
  weight?: number | null;
  weightUnit: 'lbs' | 'kg';
  duration?: number | null;
  rpe?: number | null;
  notes?: string | null;
}

export interface UpdateWorkoutData {
  name?: string;
  date?: string;
  lastModifiedTime?: string;
  notes?: string;
}

export interface UpdateWorkoutBlockData {
  label?: string;
  notes?: string;
}

export interface UpdateExerciseInstanceData {
  exerciseId?: string;
  orderInBlock?: number;
  prescription?: string;
  notes?: string;
}

export interface UpdateSetInstanceData {
  setNumber?: number;
  reps?: number | null;
  weight?: number | null;
  weightUnit?: 'lbs' | 'kg';
  duration?: number | null;
  rpe?: number | null;
  notes?: string | null;
}
