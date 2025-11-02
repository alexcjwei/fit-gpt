import mongoose, { Document, Schema } from 'mongoose';

export interface IUnresolvedExercise extends Document {
  originalName: string;
  resolvedExerciseId: string;
  userId: string;
  workoutId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const unresolvedExerciseSchema = new Schema<IUnresolvedExercise>(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    resolvedExerciseId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    workoutId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

unresolvedExerciseSchema.index({ userId: 1, originalName: 1 });
unresolvedExerciseSchema.index({ createdAt: 1 });

export const UnresolvedExercise = mongoose.model<IUnresolvedExercise>(
  'UnresolvedExercise',
  unresolvedExerciseSchema
);
