import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkoutPlan extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  duration: number; // in weeks
  workoutsPerWeek: number;
  goals: string[];
  startDate: Date;
  endDate: Date;
  active: boolean;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workoutPlanSchema = new Schema<IWorkoutPlan>(
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
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    workoutsPerWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    goals: {
      type: [String],
      default: [],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

workoutPlanSchema.index({ userId: 1, active: 1 });

export const WorkoutPlan = mongoose.model<IWorkoutPlan>('WorkoutPlan', workoutPlanSchema);
