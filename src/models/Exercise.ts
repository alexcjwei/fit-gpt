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
    category: {
      type: String,
      enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'olympic', 'full-body'],
      required: true,
    },
    muscleGroups: {
      type: [String],
      enum: ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'core', 'calves', 'forearms'],
      required: true,
    },
    equipment: {
      type: [String],
      enum: ['barbell', 'dumbbell', 'cable', 'bodyweight', 'machine', 'bands', 'kettlebell', 'smith-machine', 'trap-bar'],
    },
    description: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

exerciseSchema.index({ name: 1 });
exerciseSchema.index({ category: 1 });
exerciseSchema.index({ muscleGroups: 1 });

export const Exercise = mongoose.model<IExercise>('Exercise', exerciseSchema);
