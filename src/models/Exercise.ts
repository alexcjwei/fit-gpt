import mongoose, { Document, Schema } from 'mongoose';

export interface ISet {
  reps?: number;
  weight?: number;
  duration?: number; // in seconds
  distance?: number; // in meters
  completed: boolean;
  perceivedDifficulty?: number; // 1-10 scale
}

export interface IExercise extends Document {
  workoutId: mongoose.Types.ObjectId;
  name: string;
  sets: ISet[];
  restPeriod?: number; // in seconds
  notes?: string;
  order: number; // order within the workout
  supersetGroup?: number; // exercises with same number are in a superset
  createdAt: Date;
  updatedAt: Date;
}

const setSchema = new Schema<ISet>({
  reps: {
    type: Number,
    min: 0,
  },
  weight: {
    type: Number,
    min: 0,
  },
  duration: {
    type: Number,
    min: 0,
  },
  distance: {
    type: Number,
    min: 0,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  perceivedDifficulty: {
    type: Number,
    min: 1,
    max: 10,
  },
}, { _id: false });

const exerciseSchema = new Schema<IExercise>(
  {
    workoutId: {
      type: Schema.Types.ObjectId,
      ref: 'Workout',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sets: {
      type: [setSchema],
      default: [],
    },
    restPeriod: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    supersetGroup: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

exerciseSchema.index({ workoutId: 1, order: 1 });

export const Exercise = mongoose.model<IExercise>('Exercise', exerciseSchema);
