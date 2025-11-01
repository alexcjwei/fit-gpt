import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkout extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  totalDuration?: number; // in seconds
  scheduledDate?: Date;
  notes?: string;
  overallDifficulty?: number; // 1-10 scale
  aiGenerated: boolean;
  originalPrompt?: string; // Store the original AI prompt if AI-generated
  createdAt: Date;
  updatedAt: Date;
}

const workoutSchema = new Schema<IWorkout>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'skipped'],
      default: 'planned',
      index: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
      index: true,
    },
    totalDuration: {
      type: Number,
      min: 0,
    },
    scheduledDate: {
      type: Date,
      index: true,
    },
    notes: {
      type: String,
    },
    overallDifficulty: {
      type: Number,
      min: 1,
      max: 10,
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
    originalPrompt: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

workoutSchema.index({ userId: 1, completedAt: -1 });
workoutSchema.index({ userId: 1, scheduledDate: 1 });
workoutSchema.index({ userId: 1, status: 1 });

export const Workout = mongoose.model<IWorkout>('Workout', workoutSchema);
