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
    reps: {
      type: Number,
      min: 0,
    },
    weight: {
      type: Number,
      min: 0,
    },
    weightUnit: {
      type: String,
      enum: ['lbs', 'kg'],
      required: true,
    },
    duration: {
      type: Number,
      min: 0,
    },
    rpe: {
      type: Number,
      min: 1,
      max: 10,
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
    instruction: {
      type: String,
      required: true,
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
    label: {
      type: String,
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
  },
  {
    timestamps: true,
  }
);

workoutSchema.index({ userId: 1, date: -1 });
workoutSchema.index({ userId: 1, lastModifiedTime: -1 });

export const Workout = mongoose.model<IWorkout>('Workout', workoutSchema);
