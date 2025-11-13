import { Generated, ColumnType } from 'kysely';

// Timestamp type helper for PostgreSQL timestamptz columns
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

// User table interface
export interface UsersTable {
  id: Generated<number>;
  email: string;
  password: string;
  name: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

// Exercise table interface
export interface ExercisesTable {
  id: Generated<number>;
  name: string;
  slug: string;
  needs_review: Generated<boolean>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

// Exercise tags junction table
export interface ExerciseTagsTable {
  id: Generated<number>;
  exercise_id: number;
  tag: string;
}

// Workout table interface
export interface WorkoutsTable {
  id: Generated<number>;
  user_id: number;
  name: string;
  date: string; // ISO 8601 date format YYYY-MM-DD
  last_modified_time: Timestamp;
  notes: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

// Workout blocks table
export interface WorkoutBlocksTable {
  id: Generated<number>;
  workout_id: number;
  label: string | null;
  notes: string | null;
  order_in_workout: number;
}

// Exercise instances table (exercises within a workout block)
export interface ExerciseInstancesTable {
  id: Generated<number>;
  workout_block_id: number;
  exercise_id: number;
  order_in_block: number;
  instruction: string | null;
  notes: string | null;
}

// Set instances table (sets within an exercise instance)
export interface SetInstancesTable {
  id: Generated<number>;
  exercise_instance_id: number;
  set_number: number;
  reps: number | null;
  weight: number | null; // Using NUMERIC in DB, number in TS
  weight_unit: 'lbs' | 'kg';
  duration: number | null; // seconds
  rpe: number | null; // 1-10
  notes: string | null;
}

// Database schema interface
export interface Database {
  users: UsersTable;
  exercises: ExercisesTable;
  exercise_tags: ExerciseTagsTable;
  workouts: WorkoutsTable;
  workout_blocks: WorkoutBlocksTable;
  exercise_instances: ExerciseInstancesTable;
  set_instances: SetInstancesTable;
}
