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
      unique: true,
      sparse: true, // Allow null/undefined, but enforce uniqueness when present
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'olympic', 'full-body', 'stretching'],
      required: true,
    },
    primaryMuscles: {
      type: [String],
      enum: ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'abs', 'obliques', 'lower-back', 'upper-back', 'calves', 'forearms', 'traps', 'lats', 'rear-delts', 'hip-flexors'],
      required: true,
    },
    secondaryMuscles: {
      type: [String],
      enum: ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'abs', 'obliques', 'lower-back', 'upper-back', 'calves', 'forearms', 'traps', 'lats', 'rear-delts', 'hip-flexors'],
    },
    equipment: {
      type: [String],
      enum: ['barbell', 'dumbbell', 'cable', 'bodyweight', 'machine', 'bands', 'kettlebell', 'smith-machine', 'trap-bar', 'ez-bar', 'plate', 'medicine-ball', 'ab-wheel', 'suspension', 'sled', 'box', 'bench', 'pull-up-bar', 'dip-bar', 'cardio-machine'],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    },
    movementPattern: {
      type: String,
      enum: ['push', 'pull', 'squat', 'hinge', 'lunge', 'carry', 'rotation', 'anti-rotation', 'isometric', 'plyometric', 'olympic'],
    },
    isUnilateral: {
      type: Boolean,
    },
    isCompound: {
      type: Boolean,
    },
    description: {
      type: String,
    },
    setupInstructions: {
      type: String,
    },
    formCues: {
      type: [String],
    },
    videoUrl: {
      type: String,
    },
    alternativeExerciseIds: {
      type: [String],
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
exerciseSchema.index({ category: 1 });
exerciseSchema.index({ primaryMuscles: 1 });

export const Exercise = mongoose.model<IExercise>('Exercise', exerciseSchema);
