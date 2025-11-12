import mongoose, { Document, Schema } from 'mongoose';
import { Exercise as ExerciseType } from '../types';

export interface IExercise extends Document, Omit<ExerciseType, 'id'> {
  _id: mongoose.Types.ObjectId;
}

const exerciseSchema = new Schema<IExercise>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    tags: {
      type: [String],
    },
  },
  {
    timestamps: true,
  }
);

exerciseSchema.index({ name: 1 });
exerciseSchema.index({ slug: 1 });
exerciseSchema.index({ tags: 1 });

export const Exercise = mongoose.model<IExercise>('Exercise', exerciseSchema);
