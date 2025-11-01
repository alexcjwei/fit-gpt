import mongoose, { Document, Schema } from 'mongoose';
import { Workout as WorkoutType, WorkoutBlock, ExerciseInstance, SetInstance } from '../types';

export interface IWorkout extends Document, Omit<WorkoutType, 'id'> {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}

const setInstanceSchema = new Schema<SetInstance>(
  {
    id: {
      type: String,
      required: true,
    },
    setNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    targetReps: {
      type: Number,
      min: 0,
    },
    actualReps: {
      type: Number,
      min: 0,
    },
    targetWeight: {
      type: Number,
      min: 0,
    },
    actualWeight: {
      type: Number,
      min: 0,
    },
    weightUnit: {
      type: String,
      enum: ['lbs', 'kg'],
      required: true,
    },
    rpe: {
      type: Number,
      min: 1,
      max: 10,
    },
    completed: {
      type: Boolean,
      required: true,
      default: false,
    },
    completedAt: {
      type: String,
    },
    notes: {
      type: String,
    },
  },
  { _id: false }
);

const exerciseInstanceSchema = new Schema<ExerciseInstance>(
  {
    id: {
      type: String,
      required: true,
    },
    exerciseId: {
      type: String,
      required: true,
    },
    orderInBlock: {
      type: Number,
      required: true,
      min: 0,
    },
    sets: {
      type: [setInstanceSchema],
      default: [],
    },
    notes: {
      type: String,
    },
  },
  { _id: false }
);

const workoutBlockSchema = new Schema<WorkoutBlock>(
  {
    id: {
      type: String,
      required: true,
    },
    exercises: {
      type: [exerciseInstanceSchema],
      default: [],
    },
    notes: {
      type: String,
    },
  },
  { _id: false }
);

const workoutSchema = new Schema<IWorkout>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
    },
    lastModifiedTime: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    blocks: {
      type: [workoutBlockSchema],
      default: [],
    },
    isTemplate: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

workoutSchema.index({ userId: 1, date: -1 });
workoutSchema.index({ userId: 1, isTemplate: 1 });
workoutSchema.index({ userId: 1, lastModifiedTime: -1 });

export const Workout = mongoose.model<IWorkout>('Workout', workoutSchema);
