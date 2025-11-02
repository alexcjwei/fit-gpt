import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  fitnessLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  goals: string[];
  injuries?: string;
  exerciseHistory?: string;
  preferredWorkoutDays?: number;
  workoutLocation?: 'home' | 'gym' | 'both';
  availableEquipment?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fitnessLevel: {
      type: String,
      enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active'],
      default: 'sedentary',
    },
    goals: {
      type: [String],
      default: [],
    },
    injuries: {
      type: String,
    },
    exerciseHistory: {
      type: String,
    },
    preferredWorkoutDays: {
      type: Number,
      min: 1,
      max: 7,
    },
    workoutLocation: {
      type: String,
      enum: ['home', 'gym', 'both'],
    },
    availableEquipment: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
